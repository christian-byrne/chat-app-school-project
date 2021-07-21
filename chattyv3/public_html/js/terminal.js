/**
 * Interactive Terminal Text Input.
 *
 * @author      Christian P. Byrne
 * @exports     Terminal
 * @todo        Input parsing method.
 * @description Create an Ubuntu style terminal textbox with extendabiltiy.
 *              See versions for the Mac shell and Windows command prompt
 *              on my codepen profile: https://codepen.io/trevor-reznik.
 *              Although, there are much better versions of this type of
 *              thing available. This one is amazing: https://terminal.jcubic.pl/
 *
 * Default Shell _Commands:
 * [cd] [color] [text] [darkmode] [lightmode] [echo]
 *
 *
 */

import DB from "./db.js";

/**
 * @classdesc Add commands with addCommand method -- command should
 * be anonymous function that reads input text, calls this._parseArg()
 * to check for command name, executes, then returns input with HTML
 * entities encoded.
 *
 * @returns {Terminal}                  Terminal object.
 * @extends DB
 * @param   {HTMLDivElement}  htmlNode                            HTMLElement of the terminal.
 * @param   {Options}         options                             All properties are optional.
 * @param   {string}          [options.user="alias"]              Session name.
 * @param   {string}          [options.ps1="$"]                   Shell prompt string.
 * @param   {string}          [options.system="ubuntu"]           Comes after the @ in the prompt.
 * @param   {string}          [options.path="~"]                  Path of shell. Can represent some
 *                                                                storage structure.
 * @param   {Boolean}         [options.databaseConnection=false]  Whether logging messages through
 *                                                                DB instance.
 * @param   {Boolean}         [options.attachedHistoryNode=false] Whether displaying a log as a
 *                                                                previous sibling.
 * @param   {string[]}        [options.excludedCommands=[]]
 * @param   {object}          [options.colorMap={}]
 * @param   {object}          [options.globalNamespace=documentElement]
 *
 * @param   {Boolean}         disableCSSLoading                   Don't write custom CSS, add own.
 * @listens document#click
 * @listens document#keydown
 * @author Christian P. Byrne
 *
 * @todo replace document references with user-defined global injection point.
 */
class Terminal {
  /**
   * Terminal class for a shell GUI.
   *
   */
  constructor(htmlNode, options) {
    this._node = htmlNode;

    // Update default options with any passed by caller.
    let defaults = {
      user: "alias",
      system: "ubuntu",
      path: "~",
      ps1: "$",
      databaseConnection: false,
      attachedHistoryNode: false,
      excludedCommands: [],
      colorMap: {},
      injectionPoint: document.documentElement,
    };
    Object.assign(defaults, options);
    this.user = defaults.user;
    this._system = defaults.system;
    this._path = defaults.path;
    this._ps1 = defaults.ps1;
    this._dbAttached = defaults.databaseConnection;
    this._global = defaults.globalNamespace;
    if (defaults.attachedHistoryNode) {
      this._msgLog =
        this._node.parentElement.previousElementSibling.firstElementChild;
      this._titleBar = this._msgLog.querySelector(".termtitle");
    } else {
      this._msgLog = false;
      this._titleBar = this._node.querySelector(".termtitle");
    }

    // Components are selected relative to the passed term container node.
    this._stdin = this._node.querySelector("textarea");
    this._stdout = this._node.querySelector("div:nth-of-type(2) > div");
    this._cwd = false;
    this._buffer = this._stdin.textLength;

    // Set CSS class names.
    this.termClass = `${defaults.system}-terminal`;
    this.logClass = "message-log";
    this._both = this._msgLog
      ? `.${this.termClass}, .${this.logClass} `
      : `.${this.termClass} `;
    this._node.classList.add(this.termClass);
    if (this._msgLog) {
      this._msgLog.classList.add(this.logClass);
    }

    // Prompt colors.
    this.usernameColor = "var(--secondary-text)";
    this.pathColor = "var(--tertiary-text)";
    this.ps1Color = "var(--primary-text)";

    // CDN style assets.
    this.cdns = [
      {
        tag: "link",
        rel: "stylsheet",
        href: "https://fonts.googleapis.com/css?family=Ubuntu+Mono",
      },
      {
        tag: "link",
        rel: "stylsheet",
        href: "https://fonts.googleapis.com/css?family=Ubuntu",
      },
    ];
    for (let elem of this.cdns) {
      let link = document.createElement("link");
      link.rel = elem.rel;
      link.href = elem.href;
      document.querySelector("head").appendChild(link);
    }

    // Attach css variables to terminal container. Sub-nodes reference the variables.
    this.cssGlobals = {
      "--primary-bg": "linear-gradient(45deg, #57003f 0%, #f57453 100%)",
      "--secondary-bg": "rgba(56, 4, 40, 0.9)",
      "--tertiary-bg": "linear-gradient(#504b45 0%, #3c3b37 100%)",
      "--primary-text": "hsl(0deg, 0%, 78%)",
      "--secondary-text": "hsl(91deg, 63%, 54%)",
      "--tertiary-text": "hsl(216deg, 26%, 55%)",
      "--text-shadow": "0px 1px 0px rgba(255, 255, 255, 0.2)",
      "--disabled": "hsl(17deg, 8%, 82%)",
      "--inactive": "linear-gradient(#7d7871 0%, #595953 100%)",
      "--error": "linear-gradient(#f37458 0%, #de4c12 100%)",
      "--surface-shadow": "2px 4px 10px rgba(0, 0, 0, 0.5)",
      "--term-height": "min(min(75vw, 75vh), 375px)",
      "--term-width": "min(90vw, 600px)",
      "--gutter": "10px 0 0 7px",
      "--terminal-radius": "6px",
      "--button-shadow": "0px 0px 1px 0px #41403a, 0px 1px 1px 0px #474642",
      "--type-size": "min(min(4vw, 4vh), 14px)",
      "--term-font": " 'Ubuntu Mono', monospace, Courier",
      "--title-justify": "center",
    };
    for (const [property, value] of Object.entries(this.cssGlobals)) {
      this._node.style.setProperty(property, value);
      if (this._msgLog) {
        this._msgLog.style.setProperty(property, value);
      }
      // For demo:
      this._node.parentElement.parentElement.style.setProperty(property, value);
    }

    // Load psuedo elements by just writing innerhtml to head tag.
    this.psuedoElements = `
      ${this.termClass}.focus::after {
        position: absolute;
        content: "";
        display: inline-block;
        width: 1ch;
        height: 0.2em;
        margin-top: 0.8em;
        margin-left: 1ch;
        animation: blinking 1.2s infinite steps(1, start);
      }
      @keyframes blinking {
        0%,
        100% {
          background: var(--secondary-bg);
        }
        50% {
          background-color: var(--primary-text);
        }
      }
      ${this.termClass}::-webkit-scrollbar {  
        margin 7px -2px 7px 0px;
        padding-right: 2px;
        border-radius: 4px;
        width: 8px;
      }
      ${this.termClass}::-webkit-scrollbar-track {
        background: #f1f1f1'
        margin-right: -2px;
        padding-right: 2px;
        border-radius: 4px;
      }
      ${this.termClass}::-webskit-scrollbar-thumb {
        background: #888;
        margin-right: -2px;
        padding-right: 2px;
        border-radius: 4px;
      }
      ${this.termClass} button:hover : {
        cursor: pointer;
      }
      ${this.termClass} button:focus : {
        outline: none;
      }`;
    const appendCSS = (inner, tagname = "style") => {
      let css = document.createElement(tagname);
      css.innerHTML = inner;
      // Cross-Origin iframe support?
      let head = document.getElementsByTagName("head");
      head = head[head.length - 1];
      head.appendChild(css);
    };
    appendCSS(this.psuedoElements);
    appendCSS(this.cssGlobals);

    // Style architecture. Just change the root variables to edit easily.
    this.styles = {
      this: {
        selector: "",
        width: "var(--term-width)",
        height: "calc(var(--term-height) + 20px)",
        boxShadow: "var(--surface-shadow)",
      },
      titlebar: {
        selector: ".termtitle",
        background: "var(--tertiary-bg)",
        width: "100%",
        padding: "0 8px",
        height: "25px",
        display: "flex",
        alignItems: "center",
        borderTopLeftRadius: "var(--terminal-radius)",
        borderTopRightRadius: "var(--terminal-radius)",
      },
      buttonWrapper: {
        selector: ".termtitle > div:nth-of-type(1)",
        display: "flex",
        alignItems: "var(--title-justify)",
      },
      buttons: {
        selector: ".termtitle button",
        background: "var(--inactive)",
        textShadow: "var(--text-shadow)",
        width: "12px",
        height: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginRight: "4px",
        padding: "0",
        border: "none",
        borderRadius: "100%",
        boxShadow: "var(--button-shadow)",
        fontSize: "7px",
      },
      exitButton: {
        selector: ".termtitle button:nth-of-type(1)",
        background: "var(--error)",
      },
      titlebarP: {
        selector: ".termtitle > div:nth-of-type(2)",
        color: "var(--disabled)",
        marginLeft: "4px",
        fontSize: "12px",
        lineHeight: "14px",
        background: "var(--tertiary-bg)",
      },
      termBody: {
        selector: `.tbody`,
        background: "var(--secondary-bg)",
        height: "var(--term-height)",
        marginTop: "-1px",
        paddingTop: "2px",
        fontFamily: "var(--term-font)",
        overflowY: "scroll",
      },
      stdout: {
        selector: ".tbody > div:nth-of-type(1)",
        height: "var(--term-height)",
        color: "var(--primary-text)",
        textAlign: "start",
        padding: "var(--gutter)",
      },
      hiddenTextarea: {
        selector: ".tbody textarea",
        opacity: "0",
        height: "var(--term-height)",
        width: "595px",
        position: "absolute",
        margin: "-3px -3px -3px 0",
      },
    };

    /** Style loader. @todo Make shorter */
    const setStyleValues = (styleMap, logOnly = false) => {
      console.log(styleMap);
      const nodes1 =
        styleMap.selector.length > 0
          ? this._node.querySelectorAll(`${styleMap.selector}`)
          : [this._node];
      if (nodes1 && !logOnly) {
        for (const htmlNode of nodes1) {
          console.log(htmlNode);
          for (const [property, value] of Object.entries(styleMap)) {
            console.log(property);
            if (property != "selector") {
              htmlNode.style[property] = value;
              console.log(value);
              console.log(htmlNode.style[property]);
            }
          }
        }
      }
      const nodes2 = !this._msgLog
        ? false
        : styleMap.selector.length < 1
        ? [this._msgLog]
        : this._msgLog.querySelectorAll(`${styleMap.selector}`);
      if (nodes2) {
        for (const htmlNode of nodes2) {
          for (const [property, value] of Object.entries(styleMap)) {
            console.log(property);
            if (property != "selector") {
              htmlNode.style[property.toString()] = value;
              console.log(value);
              console.log(htmlNode.style[property]);
            }
          }
        }
      }
    };
    for (const stylemap of Object.values(this.styles)) {
      setStyleValues(stylemap);
    }

    // Optional history log container styles.
    this.msgLogStyle = {
      titlebar: {
        selector: ".termtitle",
        width: "100%",
        textAlign: "var(--title-justify)",
        marginLeft: "0",
        color: "var(--disabled)",
        fontSize: "12px",
        lineHeight: "14px",
        background: "var(--tertiary-bg)",
      },
      body: {
        selector: ".tbody > div:nth-of-type(2)",
        color: "var(--primary-text)",
        padding: "var(--gutter)",
        fontFamily: "var(--term-font)",
      },
    };
    if (this._msgLog) {
      for (const stylemap of Object.values(this.msgLogStyle)) {
        setStyleValues(stylemap, true);
      }
    }

    /** All Commands' methods are applied to input text on keydown. So always return input */
    this._Commands = {
      /** Linebreak command replaces "\n" with "<br /> + prompt". */
      linebreak: (input) => {
        return input.replace(/\n/g, `<br />${this.getPrompt()} `);
      },
      /** Shell echo command. */
      echo: (input) => {
        const echoArg = this._parseArg(input, "echo", true);
        if (echoArg) {
          const popPrompt = input.substring(
            0,
            input.length + 1 - this.getPrompt().length
          );
          return `${popPrompt}<br />${echoArg}<br />    ${this.getPrompt()} `;
        }
        return input;
      },
      /** Print command list of shell. */
      help: (input) => {
        if (this._parseArg(input, "help")) {
          const helpDialog = `Example Commands:<br /><br />cd $LOCATION<br />color $COLOR<br />text $COLOR<br />darkmode<br />lightmode<br />echo $STRING`;
          const popPrompt = input.substring(
            0,
            input.length + 1 - this.getPrompt().length
          );
          return `${popPrompt}<br />${helpDialog}<br />${this.getPrompt()}`;
        }
        return input;
      },
      /** Change shell background. */
      color: (input) => {
        const colorArg = this._parseArg(input, "color", true);
        if (colorArg) {
          this._stdout.style.background = colorArg;
        }
        return input;
      },
      /** Change shell text color. */
      text: (input) => {
        const colorArg = this._parseArg(input, "text", true);
        if (colorArg) {
          this._stdout.style.color = colorArg;
        }
        return input;
      },
      /** Change shell theme to dark or light mode. */
      theme: (input) => {
        const resetBg = () => {
          this._stdout.setAttribute(
            "style",
            "background: var(--secondary-bg); color: var(--primary-text);"
          );
          document.documentElement.setAttribute("style", "filter: none");
        };
        if (this._parseArg(input, "lightmode")) {
          if (this._stdout.style.background === "white") {
            resetBg();
          } else {
            this._stdout.setAttribute(
              "style",
              "background: white; color: #121212;"
            );
            document.documentElement.setAttribute(
              "style",
              "filter: brightness(1.1) greyscale(.2);"
            );
          }
        }
        if (this._parseArg(input, "darkmode")) {
          if (this._stdout.style.background === "white") {
            resetBg();
          } else {
            this._stdout.setAttribute(
              "style",
              "background: white; color: #121212;"
            );
            document.documentElement.setAttribute(
              "style",
              "filter: invert(1);"
            );
          }
        }
        return input;
      },
      /** Change chatroom (change directory). */
      cd: (input) => {
        let chatArg = this._parseArg(input, "cd ", true);
        if (chatArg) {
          this._path += `/${chatArg}`;
          this.cwd = true;
        }
        return input;
      },
    };

    // Delete commands that caller doesn't want.
    for (const excludeCommand of defaults.excludedCommands) {
      delete this._Commands[excludeCommand];
    }
  }

  /**
   * Run all commands on input then echo output to display div (_stdout)
   * @todo Handle deleteKey keydown.
   */
  _takeInput = () => {
    // Not capturing keydown events that are hotkeys (CTRL, CMD, TAB, etc.).
    // Account for delete key on blank line. . .
    if (this._node.querySelector("textarea").textLength === this._buffer) {
      return;
    }
    this._buffer = this._node.querySelector("textarea").textLength;

    this.cwd = false;
    setTimeout(() => {
      let input = this._stdin.value;
      for (const command in this._Commands) {
        input = this._Commands[command](input);
      }

      // Clear shell if "clear" command or "cd" command.
      const formatted = this._parseArg(input, "clear") || this.cwd ? "" : input;

      // Write to stdout and post message to database.
      this._stdout.innerHTML = `${this.getPrompt()} ${formatted} `;
      this._stdin.value = decodeURI(formatted);
      const message = this._parseArg(formatted, "decoded");
      if (
        message &&
        !Object.keys(this._Commands).includes(message.split(" ")[0].trim())
      ) {
        DB.postMsg(this.user, message, this._path);
      }
    }, 20);
  };

  /**
   * Arg parser for commands. Indicate if command name is in most recent
   * line. Optionally, return the positional arg after the command.
   *
   * Overwrite the _parseArg function to easily change parsing strategy.
   *
   * @public
   * @param    {innerHTML}      input     Teminal stdin text.
   * @param    {string}         command   Command name.
   * @param    {Boolean}        nargs     Parses positional arg if true,
   *                                        else just checks for command's
   *                                        presence.
   * @returns  {string|Boolean}           Arg.
   */
  _parseArg = (input, command, nargs = false) => {
    const currLine = input.replace(/<br \/>/g, "").split(this.getPrompt());
    const currText = currLine[currLine.length - 2];
    if (currText && input[input.length - 2] == ">") {
      if (command == "decoded") {
        return currText.trim();
      }
      if (currText.includes(command)) {
        return !nargs ? true : currText.replace(command, "").trim();
      }
    }
  };

  /**
   * @returns {string} Current shell prompt as HTML.
   */
  getPrompt = () => {
    return (
      `<span style="color: ${this.usernameColor}">${this.user}@${this._system}:` +
      `</span><span style="color: ${this.pathColor}">${this._path}</span><span` +
      ` style="color: ${this.ps1Color}">${this._ps1}</span>`
    );
  };
  /** Toggle on the CSS 'focus' class when textarea input is focused. */
  focus = () => {
    this._stdout.classList.add("focus");
  };
  /** Toggle off 'focus' CSS class when somewhere else is clicked. */
  defocus = () => {
    if (this._stdin !== document.activeElement) {
      this._stdin.nextElementSibling.classList.remove("focus");
    }
  };
  /**
   * Clear term. Calls Terminal~refresh.
   * @type {Function}
   * @private
   */
  _clear = () => {
    this._stdout.innerHTML = "";
    this._stdin.value = "";
    this.refresh();
  };

  /**
   * Update title bar and write a prompt to stdout.
   * @param   {string}  [usernam=this.user] Username to refresh to.
   * @type    {Function}
   */
  refresh = (username = this.user) => {
    this._titleBar.innerHTML = `Message History ── ${this.user}@${this._system}:${this._path}`;
    this._stdout.innerHTML = this.getPrompt();
  };
  /**
   * Initialize with event listeners and session-specific text.
   * @type {Function}
   */
  initialize = () => {
    this._stdin.addEventListener("keydown", this._takeInput);
    this._stdin.addEventListener("click", this.focus);
    document.documentElement.addEventListener("click", this.defocus);
    this.refresh();
  };

  /**
   * Add a handler for a command keyword.
   *
   * @type {Function}
   *
   * @param {string}    name            Anything, no spaces.
   * @param {Function}  commandExecutor (input: textarea~value) : input => {}.
   *  Function that will take _stdin value, parses a command, does something
   *  or edits the input, then returns the input.
   *
   */
  addCommand = (commandExecutor, name) => {
    this._Commands[name] = commandExecutor;
  };

  /**
   * @type {string[]}
   */
  get commandNames() {
    return Object.keys(this._Commands);
  }
  /**
   * @type {Function[]}
   */
  get commandParsers() {
    return Object.values(this._Commands);
  }
  /**
   * @type {string} String literal of CSS that is added.
   */
  get css() {
    return this.cssGlobals;
  }
}

export default Terminal;
