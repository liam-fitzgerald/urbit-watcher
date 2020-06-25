#!/usr/bin/env node
var watchman = require("fb-watchman");
const path = require("path");
var client = new watchman.Client();
const fs = require("fs");
const util = require("util");
const _ = require("lodash/fp");
const exec = util.promisify(require("child_process").exec);

const { DEBUG } = process.env;

function copyFile(src, dest) {
  return new Promise((res, rej) =>
    fs.copyFile(src, dest, (err) => (err ? rej(err) : res()))
  );
}

if (process.argv.length < 4) {
  console.log("Usage: urbit-watcher <path-to-repo> <paths-to-piers>");
  console.log(
    "Example: urbit-watcher ./urbit-src/pkg/arvo ./zod/home ./bus/home"
  );
  process.exit(-1);
}

const cwd = process.cwd();
const [, , srcDir, ...piers] = process.argv;
var dir_of_interest = path.resolve(cwd, srcDir);

client.command(["watch-project", dir_of_interest], function (error, resp) {
  if (error) {
    console.error("Error initiating watch:", error);
    return;
  }

  if ("warning" in resp) {
    console.log("warning: ", resp.warning);
  }

  const sub = {
    expression: ["allof", ["match", "*.hoon"]],
    fields: ["name", "size", "exists", "type"],
  };
  console.log;

  client.command(["subscribe", resp.watch, "changed", sub], function (
    err,
    res
  ) {
    if (err) {
      console.log(err);
      return;
    }
    const pierDesc = piers
      .map((p) => {
        const dirs = p.split("/");
        return dirs.slice(dirs.length - 2).join("/");
      })
      .join(", ");
    console.info(`started watching ${pierDesc}`);
  });

  client.on("subscription", (res) => {
    if (res.subscription !== "changed") return;
    if (DEBUG) {
      console.log(resp);
      console.info(`subscription: `, res);
    }

    Promise.all(
      piers.map((pier) => {
        pier = pier.split("/");
        const desk = pier.pop();
        pier = pier.join("/");
        return Promise.all(
          res.files.map(({ name }) => {
            if (!name.startsWith(resp.relative_path)) {
              return Promise.resolve(false);
            }
            const src = path.resolve(resp.watch, name);
            name = name.slice(resp.relative_path.length + 1);
            const dst = path.resolve(cwd, pier, desk, name);
            return copyFile(src, dst)
              .catch((err) => {
                console.warn(`error copying ${src} to ${dst}: `, err);
              })
              .then(() => true);
          })
        )
          .then(_.every(Boolean))
          .then((copied) => {
            if (copied) {
              exec(`herb -p hood -d '+hood/commit %${desk}' ${pier}`)
                .then(() => {
                  const pierName = pier.split("/").pop();
                  console.log(`commited %${desk} on ${pierName}`);
                })
                .catch((err) => {
                  console.warn(`error commiting files to ${pier}:`, err);
                });
            }
          });
      })
    );
  });
});
