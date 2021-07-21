/**
 * Chatty app client script.
 *
 * @author Christian P. Byrne
 */

import Terminal from "./terminal.js";
import Refresher from "./Refresher.js";

/**
 * Construct Terminal Function object and initialize it with user params.
 * @listens document#load
 */
window.onload = () => {
  // Construct Terminal instance.
  const terminalHTMLNode = document.querySelector("div.term");
  const termOptions = {
    databaseConnection: true,
    attachedHistoryNode: true,
    excludedCommands: [],
  };
  const chatNode = new Terminal(terminalHTMLNode, termOptions);
  chatNode.initialize();
  chatNode.focus();

  /**
   * Listener structure uses event delegator attached to documentElement.
   *
   * @memberof Document
   * @instance
   * */
  document.addEventListener("click", function (event) {
    const node = event.target;

    // Submit-new-alias-button listener.
    if (node.getAttribute("type") == "button") {
      const newAlias = document.querySelector("input[type=text]").value;
      chatNode.user = newAlias;
      setTimeout(() => {
        chatNode._clear();
        document.querySelector("input[type=text]").value = "Enter an alias";
      }, 200);
    }

    // 'X' button in terminal clears the terminal.
    if (node == document.querySelector("button:nth-of-type(1)")) {
      chatNode._clear();
    }
  });

  // Initialize set-interval server ping object.
  new Refresher(document.querySelector("div.msg > div:nth-of-type(2)"));
};
