<script lang="ts">
    export let cleanCallback: () => void
</script>

<div id="container">
    <h1>Oh My Git (in your browser!)</h1>

    <p>
        This is a early technical preview by <a
            target="_blank"
            href="https://bleeptrack.de">bleeptrack</a
        >
        and <a target="_blank" href="https://blinry.org">blinry</a>. We boot a
        Linux VM in your browser, where you can use a <b>real Git!</b> We invite
        you to try these low-level operations, and check out how the graph
        changes in response! Expect (and
        <a
            target="_blank"
            href="https://github.com/git-learning-game/oh-my-git-web">report</a
        >) bugs! 💚
    </p>

    <hr />

    <h2>
        <img src="/images/file.png" />Uncommitted file
        <span>Before it becomes a blob</span>
    </h2>

    <ul>
        <li>Create: <code>echo <i>content</i> &gt; <i>filename</i></code></li>
    </ul>

    <h2>
        <img src="/images/blob.png" />Blob
        <span>A piece of content</span>
    </h2>

    <ul>
        <li>
            Create from file: <code>git hash-object -w <i>filename</i></code>
        </li>
        <li>Delete (if unreferenced): <code>git prune</code></li>
    </ul>

    <h2>
        <img src="/images/wd.png" />Working directory
        <span>What you see in your project</span>
    </h2>

    <ul>
        <li>
            Point to blob in index: <code>git restore <i>filename</i> </code>
        </li>
        <li>
            Point to blob: <code
                >git restore -s <i>commit</i> <i>filename</i>
            </code>
        </li>
        <li>Release file: <code>rm <i>filename</i></code></li>
    </ul>

    <h2>
        <img src="/images/index.png" />Index
        <span>A template for building a tree</span>
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
        <img src="/images/tree.png" />Tree
        <span>A collection of blobs or other trees</span>
    </h2>

    <ul>
        <li>Create from index: <code>git write-tree</code></li>
    </ul>

    <h2>
        <img src="/images/commit.png" />Commit
        <span>Adds info to a tree, can have parents </span>
    </h2>

    <ul>
        <li>
            Create: <code>git commit-tree <i>tree</i> -m <i>"message"</i></code>
        </li>
        <li>
            Create (with parent): <code
                >git commit-tree <i>tree</i> -p <i>parent</i> -m
                <i>"message"</i></code
            >
        </li>
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
            Create: <code>git update-ref refs/<i>name</i> <i>target</i></code>
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

    <!--<h2>Fun things to try</h2>

    <ul>
    <li><input type="checkbox"/> Create a </li>
    </ul>
    -->
    <div id="clean" on:click={() => cleanCallback()}>
        ✨ Start with empty repo
    </div>
</div>

<style>
    hr {
        border: none;
        margin-bottom: 1em;
    }

    h2 span {
        font-family: sans-serif;
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

    #clean {
        padding: 0.5em;
        border-radius: 0.5em;
        background-color: #eee;
        color: black;
        display: inline-block;
        margin-top: 1em;
    }
    #clean:hover {
        cursor: pointer;
        box-shadow: 0 1px 0.2em rgba(0, 0, 0, 0.2);
    }
    #clean:active {
        background-color: #ddd;
        box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.2);
    }
</style>
