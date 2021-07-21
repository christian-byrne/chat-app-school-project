/**
 * DB Mutations for Internal MongoDB Server.
 * This should be a class that can be exported with
 * params for IP.
 * @exports DB
 *
 * @author Christian P. Byrne
 *
 *
 */

const DB = {
  /**
   * Get all message logs.
   * @returns {Promise<{id: string, alias: string, at: string, chat: string}[]>}
   */
  getLogs: async () => {
    let ret = await $.get("http://143.198.57.139:80/logs", (data) => {}).then(
      (value) => {
        return value;
      }
    );
    return ret;
  },
  searchHistory: async (depth) => {
    /**
     * Get all message logs.
     * @param   {number}  depth - Number of messages back to go.
     * @returns {Promise<{id: string, alias: string, at: string, chat: string}[]>}
     *
     */
    await $.get(`http://143.198.57.139:80/logs?depth=${depth}`, (data) => {
      return data;
    });
  },
  /**
   * Update DB with message.
   * @param {string} alias   - Username of sender.
   * @param {string} content - Text of the message.
   * @param {string} at      - Message recipient.
   * @desc  Anything not number or letter will be replaced with
   *        an underscore.
   */
  postMsg: (alias, content, at) => {
    const urlSafe = [
      alias.replace(/[^a-z0-9]/gi, "_").toLowerCase(),
      content.replace(/[^a-z0-9]/gi, "_").toLowerCase(),
      at.replace(/[^a-z0-9]/gi, "_").toLowerCase(),
    ];
    $.get(
      `http://143.198.57.139:80/msg/${encodeURI(urlSafe[0])}/${encodeURI(
        urlSafe[1]
      )}/${encodeURI(urlSafe[2])}`
    );
  },
};

export default DB;
