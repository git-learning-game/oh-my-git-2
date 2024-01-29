import {Repository, GitCommit} from "./repository"
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
}

export class CardCatalog {
    constructor(
        public name: string,
        public cards: CardID[],
    ) {}
}

export function getCardCatalogs(): CardCatalog[] {
    return [
        new CardCatalog("File handling", [
            CardID.Touch,
            CardID.Move,
            CardID.Remove,
        ]),
        new CardCatalog("Basics", [CardID.Add, CardID.Commit]),
        new CardCatalog("Branching", [CardID.Branch, CardID.Switch]),
        new CardCatalog("Tagging", [CardID.Tag]),
    ]
}
