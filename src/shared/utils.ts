export class Utils {

  /**
   * Take the first `substringSize` characters from each string and return as one string
   * @param substringSize Size of substring to take from beginning of each string
   * @param args Strings to take substrings from
   */
  public static appendSubstrings(substringSize: number, ...args: string[]): string {
    let result = "";
    for (const s of args) {
      result += (s.substr(0, substringSize));
    }
    return result;
  }

  public static get(object: any, key: string, defaultValue?: any) {
    if (key in object) {
      return object[key];
    }
    return defaultValue
  }

  public static getTimestampFromName(name: string): string {
    const regex = /.*-t([0-9]+)/;
    const match = name.match(regex);
    if (!match || match.length < 2) {
      return null;
    }
    return match[1];
  }

  /**
   * Runs an operation with auto retry policy
   * @param operation The operation to run
   * @param maxRetries The max number or retreis
   * @param retryWaitInterval The time to wait between retries
   */
  public static async runWithRetry<T>(operation: (retry?: number) => Promise<T>, maxRetries: number = 3, retryWaitInterval: number = 1000) {
    let retry = 0;
    let error = null;

    while (retry < maxRetries) {
      try {
        retry++;
        return await operation(retry);
      }
      catch (e) {
        error = e;
      }

      await Utils.wait(retryWaitInterval);
    }

    return Promise.reject(error);
  }

  /**
   * Waits for the specified amount of time.
   * @param time The amount of time to wait (default = 1000ms)
   */
  public static wait(time: number = 1000) {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }
}
