"use strict";
// https://habr.com/ru/company/2gis/blog/442720/
/**
 *
 *
 * @export
 * @class Collision
 */
export default class Collision {
  constructor(height, width) {
    this.width = Math.ceil(width / 8) * 8;
    this.height = height;

    this.buffer = new Uint8Array((this.width * this.height) / 8);
  }

  /**
   *
   *
   * @param {*} marker
   * @memberof Collision
   */
  insert(marker) {
    const { minX, minY, maxX, maxY } = marker;
    const { width, buffer } = this;

    for (let j = minY; j < maxY; j++) {
      const start = (j * width + minX) >> 3;
      const end = (j * width + maxX) >> 3;

      if (start === end) {
        buffer[start] =
          buffer[start] | ((255 >> (minX & 7)) & (255 << (8 - (maxX & 7))));
      } else {
        buffer[start] = buffer[start] | (255 >> (minX & 7));

        for (let i = start + 1; i < end; i++) {
          buffer[i] = 255;
        }

        buffer[end] = buffer[end] | (255 << (8 - (maxX & 7)));
      }
    }
  }

  /**
   *
   *
   * @param {*} marker
   * @returns
   * @memberof Collision
   */
  collides(marker) {
    const { minX, minY, maxX, maxY } = marker;
    const { width, buffer } = this;

    for (let j = minY; j < maxY; j++) {
      const start = (j * width + minX) >> 3;
      const end = (j * width + maxX) >> 3;
      let sum = 0;

      if (start === end) {
        sum = buffer[start] & ((255 >> (minX & 7)) & (255 << (8 - (maxX & 7))));
      } else {
        sum = buffer[start] & (255 >> (minX & 7));

        for (let i = start + 1; i < end; i++) {
          sum = buffer[i] | sum;
        }

        sum = (buffer[end] & (255 << (8 - (maxX & 7)))) | sum;
      }

      if (sum !== 0) {
        return true;
      }
    }

    return false;
  }

  // generalize(markers) {
  //   let nonCollisionMarker = []
  //   for (const marker of markers) {
  //       if (!this.collides(marker)) {
  //           this.insert(marker);
  //           nonCollisionMarker.push(marker)
  //       }
  //   }
  //   console.log(nonCollisionMarker.length);

  //   return nonCollisionMarker;
  // }
}

// const screenWidth = 1920;
// const screenHeight = 1080;
// const markerWidth = 10;
// const markerHeight = 5;
// const markerCount = 10000;

// const markers = [];
// for (let i = 0; i < markerCount; i++) {
//   const x = Math.floor(Math.random() * (screenWidth - markerWidth));
//   const y = Math.floor(Math.random() * (screenHeight - markerHeight));

//   markers.push({
//     minX: x,
//     minY: y,
//     maxX: x + markerWidth,
//     maxY: y + markerHeight,
//   });
// }

// console.time('Bit buffer implementation');
// let bitBufferImpl = new Collision(screenWidth, screenHeight, markers);
// console.log(bitBufferImpl);

// console.timeEnd('Bit buffer implementation');
