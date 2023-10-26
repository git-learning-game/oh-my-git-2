"use strict"

function dbg_assert(cond, msg, _) {
    if (!cond) {
        if (msg) {
            throw "Assert failed: " + msg
        } else {
            throw "Assert failed"
        }
    }
}

/**
 * Adapter to use visual screen in browsers (in contrast to node)
 * @constructor
 *
 * @param {BusConnector} bus
 */
function ScreenAdapter(screen_container, bus) {
    console.assert(screen_container, "1st argument must be a DOM container")

    var graphic_screen = screen_container.getElementsByTagName("canvas")[0],
        graphic_context = graphic_screen.getContext("2d", {alpha: false}),
        text_screen = screen_container.getElementsByTagName("div")[0],
        cursor_element = document.createElement("div")

    var /** @type {number} */
        cursor_row,
        /** @type {number} */
        cursor_col,
        /** @type {number} */
        scale_x = 1,
        /** @type {number} */
        scale_y = 1,
        base_scale = 1,
        changed_rows,
        // are we in graphical mode now?
        is_graphical = false,
        // Index 0: ASCII code
        // Index 1: Background color
        // Index 2: Foreground color
        text_mode_data,
        // number of columns
        text_mode_width,
        // number of rows
        text_mode_height

    var stopped = false

    var screen = this

    // 0x12345 -> "#012345"
    function number_as_color(n) {
        n = n.toString(16)
        return "#" + "0".repeat(6 - n.length) + n
    }

    /**
     * Charmaps that constraint unicode sequences for the default dospage
     * @const
     */
    var charmap_high = new Uint16Array([
        0x2302, 0xc7, 0xfc, 0xe9, 0xe2, 0xe4, 0xe0, 0xe5, 0xe7, 0xea, 0xeb,
        0xe8, 0xef, 0xee, 0xec, 0xc4, 0xc5, 0xc9, 0xe6, 0xc6, 0xf4, 0xf6, 0xf2,
        0xfb, 0xf9, 0xff, 0xd6, 0xdc, 0xa2, 0xa3, 0xa5, 0x20a7, 0x192, 0xe1,
        0xed, 0xf3, 0xfa, 0xf1, 0xd1, 0xaa, 0xba, 0xbf, 0x2310, 0xac, 0xbd,
        0xbc, 0xa1, 0xab, 0xbb, 0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561,
        0x2562, 0x2556, 0x2555, 0x2563, 0x2551, 0x2557, 0x255d, 0x255c, 0x255b,
        0x2510, 0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x255e, 0x255f,
        0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x2567, 0x2568,
        0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256b, 0x256a, 0x2518,
        0x250c, 0x2588, 0x2584, 0x258c, 0x2590, 0x2580, 0x3b1, 0xdf, 0x393,
        0x3c0, 0x3a3, 0x3c3, 0xb5, 0x3c4, 0x3a6, 0x398, 0x3a9, 0x3b4, 0x221e,
        0x3c6, 0x3b5, 0x2229, 0x2261, 0xb1, 0x2265, 0x2264, 0x2320, 0x2321,
        0xf7, 0x2248, 0xb0, 0x2219, 0xb7, 0x221a, 0x207f, 0xb2, 0x25a0, 0xa0,
    ])

    /** @const */
    var charmap_low = new Uint16Array([
        0x20, 0x263a, 0x263b, 0x2665, 0x2666, 0x2663, 0x2660, 0x2022, 0x25d8,
        0x25cb, 0x25d9, 0x2642, 0x2640, 0x266a, 0x266b, 0x263c, 0x25ba, 0x25c4,
        0x2195, 0x203c, 0xb6, 0xa7, 0x25ac, 0x21a8, 0x2191, 0x2193, 0x2192,
        0x2190, 0x221f, 0x2194, 0x25b2, 0x25bc,
    ])

    var charmap = [],
        chr

    for (var i = 0; i < 256; i++) {
        if (i > 126) {
            chr = charmap_high[i - 0x7f]
        } else if (i < 32) {
            chr = charmap_low[i]
        } else {
            chr = i
        }

        charmap[i] = String.fromCharCode(chr)
    }

    graphic_context.imageSmoothingEnabled = false

    cursor_element.style.position = "absolute"
    cursor_element.style.backgroundColor = "#ccc"
    cursor_element.style.width = "7px"
    cursor_element.style.display = "inline-block"

    text_screen.style.display = "block"
    graphic_screen.style.display = "none"

    this.bus = bus

    bus.register(
        "screen-set-mode",
        function (data) {
            this.set_mode(data)
        },
        this,
    )

    bus.register(
        "screen-fill-buffer-end",
        function (data) {
            this.update_buffer(data)
        },
        this,
    )

    bus.register(
        "screen-put-char",
        function (data) {
            //console.log(data);
            this.put_char(data[0], data[1], data[2], data[3], data[4])
        },
        this,
    )

    bus.register(
        "screen-update-cursor",
        function (data) {
            this.update_cursor(data[0], data[1])
        },
        this,
    )
    bus.register(
        "screen-update-cursor-scanline",
        function (data) {
            this.update_cursor_scanline(data[0], data[1])
        },
        this,
    )

    bus.register(
        "screen-clear",
        function () {
            this.clear_screen()
        },
        this,
    )

    bus.register(
        "screen-set-size-text",
        function (data) {
            this.set_size_text(data[0], data[1])
        },
        this,
    )
    bus.register(
        "screen-set-size-graphical",
        function (data) {
            this.set_size_graphical(data[0], data[1], data[2], data[3])
        },
        this,
    )

    this.init = function () {
        // not necessary, because this gets initialized by the bios early,
        // but nicer to look at
        this.set_size_text(80, 25)

        this.timer()
    }

    this.make_screenshot = function () {
        const image = new Image()

        if (is_graphical) {
            image.src = graphic_screen.toDataURL("image/png")
        } else {
            // Default 720x400, but can be [8, 16] at 640x400
            const char_size = [9, 16]

            const canvas = document.createElement("canvas")
            canvas.width = text_mode_width * char_size[0]
            canvas.height = text_mode_height * char_size[1]
            const context = canvas.getContext("2d")
            context.imageSmoothingEnabled = false
            context.font = window.getComputedStyle(text_screen).font
            context.textBaseline = "top"

            for (let x = 0; x < text_mode_width; x++) {
                for (let y = 0; y < text_mode_height; y++) {
                    const index = (y * text_mode_width + x) * 3
                    context.fillStyle = number_as_color(
                        text_mode_data[index + 1],
                    )
                    context.fillRect(
                        x * char_size[0],
                        y * char_size[1],
                        char_size[0],
                        char_size[1],
                    )
                    context.fillStyle = number_as_color(
                        text_mode_data[index + 2],
                    )
                    context.fillText(
                        charmap[text_mode_data[index]],
                        x * char_size[0],
                        y * char_size[1],
                    )
                }
            }

            if (cursor_element.style.display !== "none") {
                context.fillStyle = cursor_element.style.backgroundColor
                context.fillRect(
                    cursor_col * char_size[0],
                    cursor_row * char_size[1] +
                        parseInt(cursor_element.style.marginTop, 10) -
                        1,
                    parseInt(cursor_element.style.width, 10),
                    parseInt(cursor_element.style.height, 10),
                )
            }

            image.src = canvas.toDataURL("image/png")
        }
        return image
    }

    this.put_char = function (row, col, chr, bg_color, fg_color) {
        if (row < text_mode_height && col < text_mode_width) {
            var p = 3 * (row * text_mode_width + col)

            dbg_assert(chr >= 0 && chr < 0x100)
            text_mode_data[p] = chr
            text_mode_data[p + 1] = bg_color
            text_mode_data[p + 2] = fg_color

            changed_rows[row] = 1
        }
    }

    this.timer = function () {
        if (!stopped) {
            requestAnimationFrame(is_graphical ? update_graphical : update_text)
        }
    }

    var update_text = function () {
        for (var i = 0; i < text_mode_height; i++) {
            if (changed_rows[i]) {
                screen.text_update_row(i)
                changed_rows[i] = 0
            }
        }

        this.timer()
    }.bind(this)

    var update_graphical = function () {
        this.bus.send("screen-fill-buffer")
        this.timer()
    }.bind(this)

    this.destroy = function () {
        stopped = true
    }

    this.set_mode = function (graphical) {
        is_graphical = graphical

        if (graphical) {
            text_screen.style.display = "none"
            graphic_screen.style.display = "block"
        } else {
            text_screen.style.display = "block"
            graphic_screen.style.display = "none"
        }
    }

    this.clear_screen = function () {
        graphic_context.fillStyle = "#000"
        graphic_context.fillRect(
            0,
            0,
            graphic_screen.width,
            graphic_screen.height,
        )
    }

    /**
     * @param {number} cols
     * @param {number} rows
     */
    this.set_size_text = function (cols, rows) {
        if (cols === text_mode_width && rows === text_mode_height) {
            return
        }

        changed_rows = new Int8Array(rows)
        text_mode_data = new Int32Array(cols * rows * 3)

        text_mode_width = cols
        text_mode_height = rows

        while (text_screen.childNodes.length > rows) {
            text_screen.removeChild(text_screen.firstChild)
        }

        while (text_screen.childNodes.length < rows) {
            text_screen.appendChild(document.createElement("div"))
        }

        for (var i = 0; i < rows; i++) {
            this.text_update_row(i)
        }

        update_scale_text()
    }

    this.set_size_graphical = function (
        width,
        height,
        buffer_width,
        buffer_height,
    ) {
        if (DEBUG_SCREEN_LAYERS) {
            // Draw the entire buffer. Useful for debugging
            // panning / page flipping / screen splitting code for both
            // v86 developers and os developers
            width = buffer_width
            height = buffer_height
        }

        graphic_screen.style.display = "block"

        graphic_screen.width = width
        graphic_screen.height = height

        // add some scaling to tiny resolutions
        if (
            width <= 640 &&
            width * 2 < window.innerWidth * window.devicePixelRatio &&
            height * 2 < window.innerHeight * window.devicePixelRatio
        ) {
            base_scale = 2
        } else {
            base_scale = 1
        }

        update_scale_graphic()
    }

    this.set_scale = function (s_x, s_y) {
        scale_x = s_x
        scale_y = s_y

        update_scale_text()
        update_scale_graphic()
    }
    this.set_scale(scale_x, scale_y)

    function update_scale_text() {
        elem_set_scale(text_screen, scale_x, scale_y, true)
    }

    function update_scale_graphic() {
        elem_set_scale(
            graphic_screen,
            scale_x * base_scale,
            scale_y * base_scale,
            false,
        )
    }

    function elem_set_scale(elem, scale_x, scale_y, use_scale) {
        elem.style.width = ""
        elem.style.height = ""

        if (use_scale) {
            elem.style.transform = ""
        }

        var rectangle = elem.getBoundingClientRect()

        if (use_scale) {
            var scale_str = ""

            scale_str += scale_x === 1 ? "" : " scaleX(" + scale_x + ")"
            scale_str += scale_y === 1 ? "" : " scaleY(" + scale_y + ")"

            elem.style.transform = scale_str
        } else {
            // unblur non-fractional scales
            if (scale_x % 1 === 0 && scale_y % 1 === 0) {
                graphic_screen.style["imageRendering"] = "crisp-edges" // firefox
                graphic_screen.style["imageRendering"] = "pixelated"
                graphic_screen.style["-ms-interpolation-mode"] =
                    "nearest-neighbor"
            } else {
                graphic_screen.style["imageRendering"] = ""
                graphic_screen.style["-ms-interpolation-mode"] = ""
            }

            // undo fractional css-to-device pixel ratios
            var device_pixel_ratio = window.devicePixelRatio || 1
            if (device_pixel_ratio % 1 !== 0) {
                scale_x /= device_pixel_ratio
                scale_y /= device_pixel_ratio
            }
        }

        if (scale_x !== 1) {
            elem.style.width = rectangle.width * scale_x + "px"
        }
        if (scale_y !== 1) {
            elem.style.height = rectangle.height * scale_y + "px"
        }
    }

    this.update_cursor_scanline = function (start, end) {
        if (start & 0x20) {
            cursor_element.style.display = "none"
        } else {
            cursor_element.style.display = "inline"

            cursor_element.style.height = Math.min(15, end - start) + "px"
            cursor_element.style.marginTop = Math.min(15, start) + "px"
        }
    }

    this.update_cursor = function (row, col) {
        if (row !== cursor_row || col !== cursor_col) {
            changed_rows[row] = 1
            changed_rows[cursor_row] = 1

            cursor_row = row
            cursor_col = col
        }
    }

    this.text_update_row = function (row) {
        var offset = 3 * row * text_mode_width,
            row_element,
            color_element,
            fragment

        var bg_color, fg_color, text

        row_element = text_screen.childNodes[row]
        fragment = document.createElement("div")

        for (var i = 0; i < text_mode_width; ) {
            color_element = document.createElement("span")

            bg_color = text_mode_data[offset + 1]
            fg_color = text_mode_data[offset + 2]

            color_element.style.backgroundColor = number_as_color(bg_color)
            color_element.style.color = number_as_color(fg_color)

            text = ""

            // put characters of the same color in one element
            while (
                i < text_mode_width &&
                text_mode_data[offset + 1] === bg_color &&
                text_mode_data[offset + 2] === fg_color
            ) {
                var ascii = text_mode_data[offset]

                text += charmap[ascii]
                dbg_assert(charmap[ascii])

                i++
                offset += 3

                if (row === cursor_row) {
                    if (i === cursor_col) {
                        // next row will be cursor
                        // create new element
                        break
                    } else if (i === cursor_col + 1) {
                        // found the cursor
                        fragment.appendChild(cursor_element)
                        break
                    }
                }
            }

            color_element.textContent = text
            fragment.appendChild(color_element)
        }

        row_element.parentNode.replaceChild(fragment, row_element)
    }

    this.update_buffer = function (layers) {
        if (DEBUG_SCREEN_LAYERS) {
            // For each visible layer that would've been drawn, draw a
            // rectangle to visualise the layer instead.
            graphic_context.strokeStyle = "#0F0"
            graphic_context.lineWidth = 4
            layers.forEach((layer) => {
                graphic_context.strokeRect(
                    layer.buffer_x,
                    layer.buffer_y,
                    layer.buffer_width,
                    layer.buffer_height,
                )
            })
            graphic_context.lineWidth = 1
            return
        }

        layers.forEach((layer) => {
            graphic_context.putImageData(
                layer.image_data,
                layer.screen_x - layer.buffer_x,
                layer.screen_y - layer.buffer_y,
                layer.buffer_x,
                layer.buffer_y,
                layer.buffer_width,
                layer.buffer_height,
            )
        })
    }

    this.init()
}
