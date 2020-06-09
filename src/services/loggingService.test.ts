import { LoggingService } from "./loggingService";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";

describe("Logging Service", () => {
  let loggingService: LoggingService;

  function createService(sls?: Serverless, options?: any) {
    sls = sls || MockFactory.createTestServerless();
    return new LoggingService(sls, options || {});
  }

  it("logs info, warning and error by default, does not log debug", () => {
    const sls = MockFactory.createTestServerless();
    loggingService = createService(sls);
    loggingService.debug("Hello");
    expect(sls.cli.log).not.toBeCalled();
    loggingService.info("Info");
    expect(sls.cli.log).lastCalledWith("Info");
    loggingService.warn("Warning");
    expect(sls.cli.log).lastCalledWith("[WARN] Warning");
    loggingService.error("Error");
    expect(sls.cli.log).lastCalledWith("[ERROR] Error");
  });

  it("logs warning and error if set to warn, does not log info or debug", () => {
    const sls = MockFactory.createTestServerless();
    loggingService = createService(sls, {"verbose": "warn"});
    loggingService.info("Hello");
    loggingService.debug("Hello");
    expect(sls.cli.log).not.toBeCalled();
    loggingService.warn("Warning");
    expect(sls.cli.log).lastCalledWith("[WARN] Warning");
    loggingService.error("Error");
    expect(sls.cli.log).lastCalledWith("[ERROR] Error");
  });

  it("logs only error if set to error, does not log warn, info or debug", () => {
    const sls = MockFactory.createTestServerless();
    loggingService = createService(sls, {"verbose": "error"});
    loggingService.warn("Hello");
    loggingService.info("Hello");
    loggingService.debug("Hello");
    expect(sls.cli.log).not.toBeCalled();
    loggingService.error("Error");
    expect(sls.cli.log).lastCalledWith("[ERROR] Error");
  });

  it("boolean as option value sets logging level to debug", () => {
    const sls = MockFactory.createTestServerless();
    loggingService = createService(sls, {"verbose": true});
    loggingService.debug("Debug");
    expect(sls.cli.log).toBeCalledWith("[DEBUG] Debug");
  });
});
