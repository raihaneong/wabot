export const config = {
  isDev: process.env.NODE_ENV === "development",
  logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
};
