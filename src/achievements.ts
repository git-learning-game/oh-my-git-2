import {Repository, GitCommit} from "./repository"
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
            "Create files",
            (b: Repository, a: Repository) => {
                let bFiles = b.workingDirectory.entries.map((e) => e.name)
                let aFiles = a.workingDirectory.entries.map((e) => e.name)

                // Find all files that are in a but not in b.
                let newFiles = aFiles.filter((t) => !bFiles.includes(t))
                return newFiles.length
            },
            [CardID.Touch],
        ),
        DELETE_FILE: new Achievement(
            "Delete files",
            (b: Repository, a: Repository) => {
                let bFiles = b.workingDirectory.entries.map((e) => e.name)
                let aFiles = a.workingDirectory.entries.map((e) => e.name)

                // Find all files that are in a but not in b.
                let newFiles = bFiles.filter((t) => !aFiles.includes(t))
                return newFiles.length
            },
            [CardID.Remove],
        ),
        ADD_TO_INDEX: new Achievement(
            "Add something to the index",
            (b: Repository, a: Repository) => {
                let bEntryNames = b.index.entries.map((e) => e.name)
                let aEntryNames = a.index.entries.map((e) => e.name)

                // Find all entries that are in a but not in b.
                let newEntries = aEntryNames.filter(
                    (t) => !bEntryNames.includes(t),
                )
                return newEntries.length
            },
            [CardID.Add, CardID.Touch],
        ),
        RESTORE_FROM_INDEX: new Achievement(
            "Restore something from the index",
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
            [CardID.Add, CardID.Touch],
        ),
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
            [CardID.Commit, CardID.Touch, CardID.Add],
        ),
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
            [CardID.Tag, CardID.Commit, CardID.Touch, CardID.Add],
        ),
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
            [CardID.Tag, CardID.Commit, CardID.Touch, CardID.Add],
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
            CardID.Touch,
            CardID.Move,
            CardID.Remove,
        ]),
        new CardCatalog("Basics", 3, [
            CardID.Add,
            CardID.Commit,
            CardID.Restore,
        ]),
        new CardCatalog("Branching", 8, [CardID.Branch, CardID.Switch]),
        new CardCatalog("Tagging", 15, [CardID.Tag]),
    ]
    // Put all remaining cards into a "misc" catalog.
    let miscCatalog = new CardCatalog("Misc", 20, [])
    for (let cardID in CardID) {
        if (!catalogs.some((c) => c.cards.includes(cardID as CardID))) {
            miscCatalog.cards.push(cardID as CardID)
        }
    }
    return catalogs.concat(miscCatalog)
}
