<div>
    <h2><img src="/images/generic.png" />Uncommitted file</h2>

    <ul>
        <li>Create: <code>touch filename</code></li>
        <li>Remove: <code>rm filename</code></li>
        <li>Convert to blob: <code>git hash-object -w filename</code></li>
    </ul>

    <h2><img src="/images/blob.png" />Blob</h2>

    <ul />

    <h2><img src="/images/commit.png" />Commit</h2>

    <ul>
        <li>Create: <code>git commit-tree tree</code></li>
        <li>Create with parent: <code>git commit-tree tree -p parent</code></li>
    </ul>

    <h2><img src="/images/tree.png" />Tree</h2>

    <ul>
        <li>Create from index: <code>git write-tree</code></li>
    </ul>

    <h2><img src="/images/ref.png" />Ref</h2>

    <ul>
        <li>Create: <code>git update-ref refs/name target</code></li>
    </ul>

    <h2><img src="/images/index.png" />Index</h2>

    <ul>
        <li>Add a file: <code>git add filename</code></li>
        <li>Remove a file: <code>git rm --cached filename</code></li>
    </ul>

    <h2><img src="/images/generic.png" />Working directory</h2>

    <ul>
        <li>Create a file: <code>touch filename</code></li>
        <li>Remove a file: <code>rm filename</code></li>
    </ul>
</div>

<style>
    div {
        padding: 1em;
    }
    img {
        display: inline;
        height: 1em;
        vertical-align: middle;
        margin-right: 0.5em;
    }
</style>
