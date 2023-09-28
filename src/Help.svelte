<div>
    <h2>
        <img src="/images/generic.png" />Uncommitted file
        <span>Before it becomes a blob</span>
    </h2>

    <ul>
        <li>Create: <code>echo <i>content</i> &gt; <i>filename</i></code></li>
    </ul>

    <h2><img src="/images/blob.png" />Blob</h2>

    <ul>
        <li>
            Create from file: <code>git hash-object -w <i>filename</i></code>
        </li>
        <li>Delete (if unreferenced): <code>git prune</code></li>
    </ul>

    <h2>
        <img src="/images/generic.png" />Working directory
        <span>What you actually see</span>
    </h2>

    <ul>
        <li>
            Point to blob in index: <code>git restore <i>filename</i> </code>
        </li>
        <li>
            Point to blob: <code>git restore -s commit <i>filename</i> </code>
        </li>
        <li>Release file: <code>rm <i>filename</i></code></li>
    </ul>

    <h2>
        <img src="/images/index.png" />Index <span>Prepares next tree</span>
    </h2>

    <ul>
        <li>
            Point to file: <code>git add <i>filename</i></code>
        </li>
        <li>
            Release file: <code>git rm --cached -f <i>filename</i></code>
        </li>
    </ul>

    <h2>
        <img src="/images/commit.png" />Commit
        <span>Records author of a tree, can have parents </span>
    </h2>

    <ul>
        <li>
            Create from tree: <code
                >git commit-tree <i>tree</i> -m <i>"message"</i></code
            >
        </li>
        <li>
            Create (with parent): <code
                >git commit-tree <i>tree</i> -<i>p parent</i></code
            >
        </li>
    </ul>

    <h2>
        <img src="/images/tree.png" />Tree
        <span>A collection of blobs or other trees</span>
    </h2>

    <ul>
        <li>Create from index: <code>git write-tree</code></li>
    </ul>

    <!--<h2><img src="/images/ref.png" />HEAD</h2>

    <ul>
        <li>
            Point at commit: <code
                >git reset --soft <img src="/images/commit.png" /></code
            >
        </li>
        <li>
            🠖 <img src="/images/commit.png" /> <code>git checkout target</code>
        </li>
        <li>
            🠖 <img src="/images/ref.png" />
            <code>git switch target</code>
        </li>
    </ul>-->

    <h2>
        <img src="/images/ref.png" />Ref
        <span>Flexible pointers</span>
    </h2>

    <ul>
        <li>
            Create: <code>git update-ref <i>name</i> <i>target</i></code>
            (should start with <code>ref/</code>)
        </li>
        <li>
            Point at object: <code
                >git update-ref --no-deref <i>name</i> <i>target</i></code
            >
        </li>
        <li>
            Point at ref: <code>git symbolic-ref <i>name</i> <i>target</i></code
            >
        </li>
        <li>Delete: <code>git update-ref -d <i>name</i></code></li>
    </ul>
</div>

<style>
    h2 span {
        font-size: 70%;
        font-style: italic;
        font-weight: normal;
        color: grey;
    }
    div {
        padding: 1em;
    }
    img {
        display: inline;
        height: 1em;
        vertical-align: middle;
        margin-right: 0.5em;
    }
    li {
        list-style-type: none;
    }
</style>
