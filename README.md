
# Urbit Watcher

Watches the urbit repo for changes and copies them into your desks

## Installation

### Dependencies

- [watchman](https://facebook.github.io/watchman/docs/install)
- [herb](https://github.com/urbit/urbit/tree/master/pkg/herb)

### NPM

Once you have the dependencies, install this package from npm

```sh
npm i -g urbit-watcher
```

## Usage

```sh
urbit-watcher <source> <path to desks>
```

e.g.

``` sh
urbit-watcher ./urbit-src/pkg/arvo ./zod ./bus
```

Note that the source argument should have a directory structure that mimics the
normal structure of a urbit desk. e.g. app/ gen/ lib etc.



