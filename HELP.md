# Polygram Guide

Polygram is an app for creating interesting 2d imagery by tweaking a set of fields in the sidebar. Any changes to a field you make are immediately reflected in the drawing. The app is all about combinations: the coolest animations are discovered by playing with the interaction of different fields and functions.

Before starting, check that hardware acceleration for graphics in your browser is enabled. In Firefox or Chrome, it should be enabled by default.
* [Enabling hardware acceleration in Chrome](https://www.howtogeek.com/412738/how-to-turn-hardware-acceleration-on-and-off-in-chrome/)

## Layers

A "layer" in polygram represents a collection of the same repeated shapes, such as a circle, triangle, or square. The shape is always defined as a regular polygon (line, triangle, square, pentagon, hexagon, etc), but the shape can be stretched and skewed as you please.

The shape in a layer starts out as a single copy, but you can tweak the "copies" field to have the shape repeat in the canvas.

Every form field under a layer represents a numeric value. In addition to simple numbers, every field can be written as a **javascript expression** that gets re-evaluated on every frame of the animation.

The fields for a layer are:

* **copies** - Repeat the shapes in a layer a number of times
* **sides** - The number of sides for the polygon(s) in this layer. If greater than 30, then it becomes a circle.
* **x** - The horizontal coordinate of each shape in amount of pixels. The leftmost side of the canvas starts at 0 and increases going right.
* **y** - The vertical coordinate of each shape in amount of pixels. The top starts at zero and increases going downward.
* **fill** - Check to add a fill color for every shape -- otherwise transparent.
    * **red** - 0-255 red value for the fill, where 255 is the most red
    * **green** - 0-255 green value for the fill, where 255 is the most green
    * **blue**  - 0-255 blue value for the fill, where 255 is the most blue
    * **alpha** - 0-1 decimal value for the transparency, where 0 is invisible and 1 is fully opaque.
* **stroke** - Check mark to draw a line around the edge of each shape.
    * **red** - 0-255 red value for the fill, where 255 is the most red
    * **green** - 0-255 green value for the fill, where 255 is the most green
    * **blue** - 0-255 blue value for the fill, where 255 is the most blue
    * **stroke width** - The pixel width of the line width on the edge
    * **alpha** - 0-1 decimal value for the transparency, where 0 is invisible and 1 is fully opaque.
* **rotation** - Check mark to rotate each shape
    * **radians** - Amount of rotation in radians, where `Math.PI` is 180 degrees, and `Math.PI/2` is 90 degrees, etc.
    * **X origin** - The horizontal position on the shape around which we rotate (where 0 is the left side of the shape)
    * **Y origin** - The vertical position on the shape around which we rotate (where 0 is the top of the shape)
* **scale** - Check mark to resize the shape. All shapes start with a 100 pixels default radius. To make a shape 200 pixels tall, then set vertical scale to `2`. To make a shape 50 pixels wide, then set the horizontal scale to `0.5`.
    * **vertical** - increase or decrease the size of the shape vertically, starting at 1
    * **horizontal** - increase or decrease the size of the shape horizontally, starting at 1
* **skew** - Check mark to stretch the shape vertically or horizontally, where a value of 1 is no skew.
    * **vertical** - stretch the shape vertically
    * **horizontal** - stretch the shape horizontally

## Constants

The section labeled "constants" is for defining plain numbers that you want to re-use in any fields in your layers.

For example, you might define a "speed" constant for controlling the speed of the animation, which is reused in several places in your layers. When you tweak this constant, your fields will all be instantly updated to use the new value, similar to a spreadsheet.

Note that you can't use javascript functions in a constant field, only plain numbers.

## Special functions and variables

Since fields can be written as javascript, there are some special variables and functions you can use inside of them.

## `i`

`i` is a number from 0 up to the number of copies in your layer. For each shape in your layer, `i` will be a different number, starting at 0 and incrementing up by 1. You can use this variable to position, size, or animate the shapes in a layer differently.

For example, to repeat squares horizontally across the canvas, set "copies" to `5` and set the `x` field to `110 * x`.

For animations (described further down), `i` can be used to animate each shape in your layer at a different speed.

`i` can be used in any field. It's an important variable to use to make interesting images.

## `ts()`

`ts()` is a function for getting the current time as a number. This is the key function for animating your shapes, as it will increment on every frame, so you can use it to animate position, transparency, color, size, etc.

This function will give you a very large number, so you will usually want to multiply it by something like `0.0001` to reduce it.

For example, to create a rotating animation, set the `radians` field (under `rotation`) to be `0.0001 * ts()`.

## All other javascript utilities

Values in any field in a layer can be Javascript expression, and have access to all built-in Javascript utilities, such as:

* Math.sin(n) - sine function
* Math.PI - approximation of pi
* Math.pow(x,y) - power
* Math.abs(n) - absolute value
* Math.E - Euler's constant
* Math.SQRT2 - approximation of the square root of 2

Play with all these math functions or constants in your animations to discover interesting results ([reference page](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)).

# Sharing and saving

You can share polygrams by clicking the "Share" button, which gives you a long URL that you can send to others. When someone else uses that URL, your drawing will be shown.

When you click the "Share" button, the state of your drawing gets dumped into the URL of the page. You can use that URL to save your drawing for later, such as by pasting it into a document.

# Howtos

## Draw a line

1. Start a new polygram by going [here](https://jayrbolton.github.io/polygram)
1. Change the default layer to have `Sides` be `2`.
1. Uncheck the `fill` check mark.
1. Check the `stroke` check mark.

* To change the length of the line, check the `scale` check mark and increase the `horizontal` field.
* To change the width of the line, increase the `stroke width` field.

## Animate properties of a shape in different ways

Use the `ts()` function for animation.

### Rotation

1. Start a new polygram by going [here](https://jayrbolton.github.io/polygram)
1. Check the `rotation` box.
1. Enter `0.001 * ts()` as the value for the `radians` field.

### Movement

Using `ts()` alone doesn't work well for x and y coordinate animations, because it grows indefinitely, causing your shapes to travel off the screen. To prevent this, we can combine the `ts()` function with a function such as `Math.sin` or module (`%`) to keep your values within a certain boundary.

1. Start a new polygram by going [here](https://jayrbolton.github.io/polygram)
1. In the `x` field, enter `300 + Math.sin(0.005 * ts()) * 50`.
   - The `300` represents the starting point, while `0.005` represents the speed and `50` represents the range.
1. In the `y` field, enter `300 + Math.sin(0.01 * ts()) * 50`.

### Opacity

Opacity can be animated by repeating values between 0 and 1.

1. Start a new polygram by going [here](https://jayrbolton.github.io/polygram)
1. In the `fill alpha` field, enter `(ts() * 0.001) % 1`.

This equation rises from 0 to 1 linearly and then resets to 0. You can also use `Math.abs(Math.sin(ts() * 0.001))`, for example, for a different effect. 

## Draw a grid of squares

To draw a 9x9 grid of squares, we can use the `i` variable and a little bit of math. The `i` variable will start at 0 and go up to 8 for each of the 9 squares. We want to use it to set the `x` and `y` fields for the layer.

One grid we can draw looks like this, where each number is the `i` value:

```
0 1 2
3 4 5
6 7 8
```

We want to translate the above values into the x and y coordinates below:

```
[0, 0] [1, 0] [2, 0]
[0, 1] [1, 1] [2, 1]
[0, 2] [1, 2] [2, 2]
```

Each pair of numbers in brackets is a square in the grid. The first number is the x coordinate, while the second number is the y coordinate.

For calculating the `x` value of each square from `i`, we can use `i % 3`. This gives us 0, 1, 2, repeating.

For the `y` value, we can use `Math.floor(i / 3)`. This gives us `0` for the first three `i` values (0, 1, 2), then `1` for the second three `i` values (3, 4, 5), and then `2` for the last three (6, 7, 8).

To add spacing between each square, use a multiplier such as `i % 3 * 200` and `Math.floor(i / 3) * 200`.

To offset the entire grid from the top or bottom of the canvas, add a constant such as `i % 3 * 200 + 100` and `Math.floor(i / 3) * 200 + 100`.

1. Start a new polygram by going [here](https://jayrbolton.github.io/polygram)
1. Change the "Copies" field to `9`.
1. Change the "x" field to `i % 3 * 200 + 100`
1. Change the "y" field to `Math.floor(i / 3) * 200 + 100`

# Examples

* [Shimmering circles](https://jayrbolton.github.io/polygram/#eJxtkU1rwzAMhv+KEQzSzeucjo7i23bYdtmlg30QenATh5iaONguXVf63yc7btPSHYL1vpKlJ/IONsBnjFFo0lk74LDUolwBhRJFUYDrRClRPjBY0AJK0ynpUOcMjQUFGcp2UAPfQSPcs9IaeC20kzToufHCK9Oeeu/empUE7u06GSu5OSsohU75PYUutHaqCpPgngW0HoIPND8oFLkiOSPXJCKTGxIQKWwx9SZ8M661MTZT5A4To4uyGsHnsgI+iZtA9WKlRO6knvRaniQfddcI7DyeTPGyi38UrwM76tQAJtOhpm9zZh1aRUixdFkMnGoz77IAysaMsRwDNRodb32qyuO7wSzOwwV+SOsVLi4SB+PVWPVrWn+wwlKHIiSHZJ4W9rYVlRJt2HCcncYnHIXff4h5gLPhveVXnNjH3xjjK4ZFaLGV9pbBfrH/A7dDvT8=)
* [Strange star](https://jayrbolton.github.io/polygram/#eJyNkctqwzAQRX/FDBScVgljk0DRrl203XSTQh8EL1RbxiLCCpJCmob8e0eyHJxdF0Zz53E8ujrBAfg9IoMuna0DDt9a1FtgUJPYbKAGViBWFQMZEidogZ+gE+5JaQ28FdpJFvTaeOGV6YF7ux9Sb96arZwmtvIwlbXQqXxmsAtgp5rwHyjDBmanolghqR8Klhii4yVqaYe1bICXcX1Sz1ZKWiGpR72Xk+KD3nUCeMHAxc3iKJQRNWTS+FVugOAoEwRehe8WTvU5LhCxyG4z7/IZHfkKs3mmZrML4UM1njwuSZMB79J6RTefMtKoom/AxWFqfjFW/Zre/6c9uDmBF9kdddxky7F2xZpWrWiU6IPTCRyh8U7jZUJXeGD5Ga0Y4i+K6eGCYVocpZ0jnKvzHyNIru4=)
* [Swimming squares](https://jayrbolton.github.io/polygram/#eJyNUstOwzAQ/BWzXNoSgp0mqOQGB+DCpUg8hHqwGodYjZJiuyq06r+za4e0EqrUXDI7zszsrrOFNeRwnXKIoOpRaRGeJ0mCeI74YxaBovcWSsi3UEl7r+sa8lLWVkVUT1snnW4byJ1ZBerZmXahDom5rLt6F8GSnKwuyDjFnHapCcKEOvhGIDLOLtg44eySaTZiKfI/R/gS25mqAnIe8INRqumru3qFuYJ35W29rCQexlkE1jfppUDBoe7kkPA9F0wgybKe6oyAuuAxF5P+5FUXjvZJG7QLtX5Rxmkc37dExGNr9KZt3B9Fq9l/BE/SVbHVzWAw8WMOR8zZwTDk4CMIenMSHpr9l7JjWiMLLRva+TgWqchurmiVhm5Svfm2An73eN2NdJp/90sp/Vm5U+cJGj8RxosOYrrA34Wuw36tpFGbM9jNdr/YrcMZ)

