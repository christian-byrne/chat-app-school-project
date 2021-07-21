/**
 * Interval Server Pinger.
 * @author Christian P. Byrne
 * @exports Refresher
 */

import DB from "./db.js";

/**
 *
 * @classdesc Refresher class for object that pings server on interval.
 */
class Refresher {
  /** @param {number} [interval=1] In seconds. */
  constructor(contentBox, interval = 1, PS1 = "$", location = "") {
    this.contentBox = contentBox;
    this._mostRecent = contentBox.children;
    function msgLine(message) {
      const div = document.createElement("div");
      div.innerHTML =
        `<span style="color: var(--secondary-text)">${message.alias}` +
        `@${message.at}:</span><span style="color: var(--tertiary-text)"` +
        `">${location}</span><span style="color: var(--primary-text)">${PS1}` +
        `</span> ${message.content.replace("_", " ")}`;
      return div;
    }
    this.currDepth = 0;
    setInterval(() => {
      DB.getLogs().then((logs) => {
        this._mostRecent = contentBox.children;
        let messages = Object.keys(logs);
        // Append new messages only to message history node.
        while (messages.length > this.currDepth) {
          this.contentBox.appendChild(msgLine(logs[messages[this.currDepth]]));
          this.currDepth += 1;
        }
      });
    }, Math.floor(interval * 1000));
  }
}

export default Refresher;
