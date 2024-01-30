<script>
    import {getArrow} from "perfect-arrows"

    export let p1 = {x: 360, y: 240}
    export let p2 = {x: 128, y: 96}
    let sx, sy, cx, cy, ex, ey, ae, as, ec, endAngleAsDegrees

    $: [sx, sy, cx, cy, ex, ey, ae, as, ec] = getArrow(p1.x, p1.y, p2.x, p2.y, {
        padEnd: 20,
    })

    let wd = 1080
    let ht = 720
</script>

<div class="arrow">
    <svg
        view-box="0 0 {wd} {ht}"
        style="width: {wd}px; height: {ht}px"
        stroke="#000"
        fill="#000"
        stroke-width="3px"
    >
        <circle cx={sx} cy={sy} r="4" />
        <path d="M{sx},{sy} Q{cx},{cy} {ex},{ey}" fill="none" />
        <polygon
            points="0,-6 12,0, 0,6"
            transform="translate({ex},{ey}) rotate({ae * (180 / Math.PI)})"
        />
    </svg>
</div>

<style>
    div {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
    }
</style>
