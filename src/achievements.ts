import {Repository, GitCommit, GitBlob} from "./repository"
import type {ObjectID} from "./repository"
import {CardID} from "./cards"
import {uniq} from "lodash"

export class Achievement {
    constructor(
        public description: string,
        public checkFunction: (b: Repository, a: Repository) => number,
        public requiredCards: CardID[] = [],
    ) {}
    check(before: Repository, after: Repository): number {
        return this.checkFunction(before, after)
    }
}

export function getAchievements() {
    return {
        CREATE_FILE: new Achievement(
            "Create files (with different content)",
            (b: Repository, a: Repository) => {
                let bContentCounts = getContentCount(b)
                let aContentCounts = getContentCount(a)

                // Count how many new contents appeared.
                return Object.keys(aContentCounts).filter(
                    (t) => !Object.keys(bContentCounts).includes(t),
                ).length
            },
            [CardID.Create, CardID.Append],
        ),
        DELETE_FILE: new Achievement(
            "Delete files (with different content)",
            (b: Repository, a: Repository) => {
                let bContentCounts = getContentCount(b)
                let aContentCounts = getContentCount(a)

                // Count how many contents disappeared.
                return Object.keys(bContentCounts).filter(
                    (t) => !Object.keys(aContentCounts).includes(t),
                ).length
            },
            [CardID.Remove],
        ),
        COPY_FILE: new Achievement(
            "Make copies of files",
            (b: Repository, a: Repository) => {
                // Strategy: count how many files have identical copies in the working directory. In the after state, there must be more copies of identical content than before.
                let contentCountBefore = getContentCount(b)
                let contentCountAfter = getContentCount(a)

                // Count how many contents now have more copies than before (but existed before).
                return Object.keys(contentCountAfter).filter(
                    (content) =>
                        contentCountBefore[content] !== undefined &&
                        contentCountAfter[content] >
                            contentCountBefore[content],
                ).length
            },
            [CardID.Copy],
        ),
        MOVE_FILE: new Achievement(
            "Move files",
            (b: Repository, a: Repository) => {
                // Strategy: In the after state, there must be a file with the same content as before, but a different name.

                let bFiles = workingDirectoryEntries(b)
                let aFiles = workingDirectoryEntries(a)

                // For each file in a, count it if there was a file with the same content in b, but a different name, and that name is not in a.
                return Object.keys(aFiles).filter(
                    (name) =>
                        !Object.keys(bFiles).includes(name) &&
                        Object.entries(bFiles).filter(
                            ([name2, content]) =>
                                content === aFiles[name] &&
                                name2 !== name &&
                                !Object.keys(aFiles).includes(name2),
                        ).length > 0,
                ).length
            },
            [CardID.Move],
        ),
        // MODIFY_FILE
        ADD_TO_INDEX: new Achievement(
            "Add files to the index",
            (b: Repository, a: Repository) => {
                let bEntryNames = b.index.entries.map((e) => e.name)
                let aEntryNames = a.index.entries.map((e) => e.name)

                // Find all entries that are in a but not in b.
                let newEntries = aEntryNames.filter(
                    (t) => !bEntryNames.includes(t),
                )
                return newEntries.length
            },
            [CardID.Add, CardID.Create],
        ),
        DELETE_FROM_INDEX: new Achievement(
            "Delete entries from the index",
            (b: Repository, a: Repository) => {
                let bEntryNames = b.index.entries.map((e) => e.name)
                let aEntryNames = a.index.entries.map((e) => e.name)

                // Find all entries that are in b but not in a.
                let deletedEntries = bEntryNames.filter(
                    (t) => !aEntryNames.includes(t),
                )
                return deletedEntries.length
            },
            [CardID.RmCached],
        ),
        RESTORE_FROM_INDEX: new Achievement(
            "Restore files from the index",
            (b: Repository, a: Repository) => {
                // Loop through index, and count how many files have identical copies in the working directory.
                let identicalOIDs: ObjectID[] = []
                for (let indexEntry of b.index.entries) {
                    let workingDirectoryEntry = b.workingDirectory.entries.find(
                        (e) => e.name === indexEntry.name,
                    )
                    if (
                        workingDirectoryEntry !== undefined &&
                        workingDirectoryEntry.oid === indexEntry.oid
                    ) {
                        identicalOIDs.push(indexEntry.oid)
                    }
                }

                // Count the same things for the "after" state.
                let identicalOIDsAfter = []
                for (let indexEntry of a.index.entries) {
                    let workingDirectoryEntry = a.workingDirectory.entries.find(
                        (e) => e.name === indexEntry.name,
                    )
                    if (
                        workingDirectoryEntry !== undefined &&
                        workingDirectoryEntry.oid === indexEntry.oid
                    ) {
                        // Check that this OID was in the index in the "before" state.
                        if (
                            b.index.entries.find(
                                (e) => e.oid === indexEntry.oid,
                            )
                        ) {
                            identicalOIDsAfter.push(indexEntry.oid)
                        }
                    }
                }

                // Count how many OIDs are in the "after" state but not in the "before" state.
                let newIdenticalEntries = identicalOIDsAfter.filter(
                    (t) => !identicalOIDs.includes(t),
                )
                return newIdenticalEntries.length
            },
            [CardID.Add, CardID.Create],
        ),
        // EMPTY_INDEX
        CREATE_COMMIT: new Achievement(
            "Create commits",
            (b: Repository, a: Repository) => {
                let bCommitIDs = Object.values(b.objects)
                    .filter((o) => o instanceof GitCommit)
                    .map((o) => o.oid)
                let aCommitIDs = Object.values(a.objects)
                    .filter((o) => o instanceof GitCommit)
                    .map((o) => o.oid)

                let newCommits = aCommitIDs.filter(
                    (t) => !bCommitIDs.includes(t),
                )
                return newCommits.length
            },
            [CardID.Commit, CardID.Create, CardID.Add],
        ),
        DETACH_HEAD: new Achievement(
            "Detach your HEAD (from a non-detached state)",
            (b: Repository, a: Repository) => {
                if (
                    Object.keys(b.refs).includes("HEAD") &&
                    Object.keys(a.refs).includes("HEAD")
                ) {
                    if (
                        b.refs["HEAD"].target.startsWith("refs/heads/") &&
                        !a.refs["HEAD"].target.startsWith("refs/heads/")
                    ) {
                        return 1
                    }
                }
                return 0
            },
            [CardID.SwitchDetach],
        ),
        // CREATE_BRANCH
        CREATE_TAGS: new Achievement(
            "Create tags",
            (b: Repository, a: Repository) => {
                let bTags = Object.keys(b.refs).filter((r) =>
                    r.startsWith("refs/tags/"),
                )
                let aTags = Object.keys(a.refs).filter((r) =>
                    r.startsWith("refs/tags/"),
                )

                // Find all tags that are in a but not in b.
                let newTags = aTags.filter((t) => !bTags.includes(t))
                return newTags.length
            },
            [CardID.Tag, CardID.Commit, CardID.Create, CardID.Add],
        ),
        // DELETE_TAGS
        CREATE_TAGS_DIFFERENT_COMMITS: new Achievement(
            "Create tags on different commits",
            (b: Repository, a: Repository) => {
                let bTags = uniq(
                    Object.values(b.refs)
                        .filter((r) => r.name.startsWith("refs/tags/"))
                        .map((r) => r.target),
                )

                console.log(bTags)

                let aTags = uniq(
                    Object.values(a.refs)
                        .filter((r) => r.name.startsWith("refs/tags/"))
                        .map((r) => r.target),
                )
                console.log(aTags)

                // Find all tags that are in a but not in b.
                let newTags = aTags.filter((t) => !bTags.includes(t))
                return newTags.length
            },
            [CardID.Tag, CardID.Commit, CardID.Create, CardID.Add],
        ),
        MERGE_CONFLILCT: new Achievement(
            "Create a merge conflict",
            (b: Repository, a: Repository) => {
                // Count index entries with stage number != 0
                let beforeIndexEntriesOfStageUnequal0 = b.index.entries.filter(
                    (e) => e.stage !== 0,
                ).length

                // The same in the after state.
                let afterIndexEntriesOfStageUnequal0 = a.index.entries.filter(
                    (e) => e.stage !== 0,
                ).length

                if (
                    beforeIndexEntriesOfStageUnequal0 === 0 &&
                    afterIndexEntriesOfStageUnequal0 > 0
                ) {
                    return 1
                } else {
                    return 0
                }
            },
            [CardID.Commit, CardID.Merge],
        ),
        OCTOPUS_MERGE: new Achievement(
            "Create a merge commit with three parents",
            (b: Repository, a: Repository) => {
                let tripleMergeBefore: ObjectID[] = []
                for (let object of Object.values(b.objects)) {
                    if (object instanceof GitCommit) {
                        if (object.parents.length == 3) {
                            tripleMergeBefore.push(object.oid)
                        }
                    }
                }

                let tripleMergeAfter: ObjectID[] = []
                for (let object of Object.values(a.objects)) {
                    if (object instanceof GitCommit) {
                        if (object.parents.length == 3) {
                            tripleMergeAfter.push(object.oid)
                        }
                    }
                }

                let newTripleMerges = tripleMergeAfter.filter(
                    (t) => !tripleMergeBefore.includes(t),
                )
                return newTripleMerges.length
            },
            [CardID.Joker],
        ),
    }
}

function workingDirectoryEntries(repository: Repository): {
    [filename: string]: string
} {
    let entries: {[filename: string]: string} = {}
    for (let entry of repository.workingDirectory.entries) {
        entries[entry.name] = workingDirectoryEntryContent(
            entry.name,
            repository,
        )
    }
    return entries
}

function nonEmptyWorkingDirectoryEntries(repository: Repository): {
    [filename: string]: string
} {
    return Object.fromEntries(
        Object.entries(workingDirectoryEntries(repository)).filter(
            ([_, content]) => content !== "",
        ),
    )
}

function getContentCount(repository: Repository): {[key: string]: number} {
    let contentCount: {[key: string]: number} = {}
    for (let entry of repository.workingDirectory.entries) {
        let content = workingDirectoryEntryContent(entry.name, repository)
        if (contentCount[content] === undefined) {
            contentCount[content] = 0
        }
        contentCount[content] += 1
    }
    return contentCount
}

function getNonEmptyContentCount(repository: Repository): {
    [key: string]: number
} {
    return Object.fromEntries(
        Object.entries(getContentCount(repository)).filter(
            ([content, _]) => content !== "",
        ),
    )
}

function workingDirectoryEntryContent(name: string, repository: Repository) {
    let entry = repository.workingDirectory.entries.find((e) => e.name === name)
    if (entry === undefined) {
        throw new Error(
            `Working directory entry ${name} not found in repository.`,
        )
    }
    if (entry.oid === undefined) {
        return repository.files[entry.name].content
    } else {
        let object = repository.objects[entry.oid]
        if (object === undefined) {
            throw new Error(
                `Object ${entry.oid} referenced by working directory entry ${name} not found in repository.`,
            )
        }
        if (!(object instanceof GitBlob)) {
            throw new Error(
                `Object ${entry.oid} referenced by working directory entry ${name} is not a blob.`,
            )
        }
        return object.content
    }
}

class AchievementProgress {
    constructor(
        public achievement: Achievement,
        public target: number,
        public progress: number,
        public visible: boolean = false,
    ) {}
}

export class AchievementTracker {
    public achievementProgresses: AchievementProgress[] = []

    constructor(
        public achievementCompletedCallback: (a: Achievement) => void = (
            _,
        ) => {},
    ) {}

    add(achievement: Achievement, target: number) {
        if (achievement === undefined) {
            throw new Error("Tried to add an undefined achievement.")
        }
        this.achievementProgresses.push(
            new AchievementProgress(achievement, target, 0),
        )
    }

    update(before: Repository, after: Repository) {
        for (let progress of this.achievementProgresses) {
            let progressBefore = progress.progress
            progress.progress += progress.achievement.check(before, after)
            progress.progress = Math.min(progress.progress, progress.target)
            if (
                progress.progress >= progress.target &&
                progressBefore < progress.target
            ) {
                this.achievementCompletedCallback(progress.achievement)
            }
        }
    }

    getPoints(): number {
        let points = 0
        for (let progress of this.achievementProgresses) {
            points += progress.progress
        }
        return points
    }
}

export class CardCatalog {
    constructor(
        public name: string,
        public cost: number = 0,
        public cards: CardID[],
    ) {}
}

export function getCardCatalogs(): CardCatalog[] {
    let catalogs = [
        new CardCatalog("File handling", 0, [
            CardID.Create,
            CardID.Append,
            CardID.Move,
            CardID.Copy,
            CardID.Remove,
        ]),
        new CardCatalog("Index", 10, [
            CardID.Add,
            CardID.AddAll,
            CardID.Restore,
            CardID.RestoreAll,
            CardID.RmCached,
        ]),
        new CardCatalog("Commit", 16, [
            CardID.Commit,
            CardID.CommitAll,
            CardID.Branch,
            CardID.Switch,
            CardID.SwitchDetach,
        ]),
        new CardCatalog("Tags", 20, [CardID.Tag, CardID.TagDelete]),
        new CardCatalog("Merge", 26, [CardID.Merge]),
        new CardCatalog("Viewing", 31, [
            CardID.Log,
            CardID.Status,
            CardID.Diff,
            CardID.DiffCached,
        ]),
    ]
    // Put all remaining cards into a "misc" catalog.
    let miscCatalog = new CardCatalog("Misc", 31, [])
    for (let cardID in CardID) {
        if (!catalogs.some((c) => c.cards.includes(cardID as CardID))) {
            miscCatalog.cards.push(cardID as CardID)
        }
    }
    return catalogs.concat(miscCatalog)
}
