#!/usr/bin/env node
var watchman = require("fb-watchman");
const path = require("path");
var client = new watchman.Client();
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

function copyFile(src, dest) {
  return new Promise((res, rej) =>
    fs.copyFile(src, dest, err => (err ? rej(err) : res()))
  );
}

if (process.argv.length < 4) {
  console.log("Usage: urbit-watcher <path-to-repo> <paths-to-desks>");
  process.exit(-1);
}

const cwd = process.cwd();
const [, , srcDir, ...piers] = process.argv;
var dir_of_interest = path.resolve(cwd, srcDir, "pkg/arvo");

client.command(["watch-project", dir_of_interest], function(error, resp) {
  if (error) {
    console.error("Error initiating watch:", error);
    return;
  }

  if ("warning" in resp) {
    console.log("warning: ", resp.warning);
  }

  const sub = {
    expression: ["allof", ["match", "*.hoon"]],
    fields: ["name", "size", "exists", "type"]
  };

  client.command(["subscribe", resp.watch, "changed", sub], function(err, res) {
    if (err) {
      console.log(err);
      return;
    }
  });

  client.on("subscription", res => {
    if (res.subscription !== "changed") return;
    Promise.all(
      piers.map(pier => {
        return Promise.all(
          res.files.map(({ name }) => {
            if (!name.startsWith(resp.relative_path)) {
              return Promise.resolve();
            }
            const src = path.resolve(resp.watch, name);
            name = name.slice(resp.relative_path.length + 1);
            const dst = path.resolve(cwd, pier, "home", name);
            return copyFile(src, dst);
          })
        ).then(() => exec(`herb -p hood -d '+hood/commit %home' ${pier}`));
      })
    );
  });
});
