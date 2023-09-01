(function() {
  'use strict';
  var $, Async_pipeline, FS, G, GUY, Intersock, My_watcher, PATH, Pipeline, _debounce, after, alert, create_pipeline, debounce, debug, defer, demo, echo, file_dt, help, info, inspect, log, plain, praise, rpr, sleep, urge, warn, whisper, xxx;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('GUY/temp/tests'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  PATH = require('path');

  FS = require('fs');

  // { freeze }                = require 'letsfreezethat'
  // H                         = require './helpers'
  // types                     = new ( require 'intertype' ).Intertype()
  // { isa
  //   declare
  //   type_of
  //   validate
  //   equals }                = types
  ({Pipeline, Async_pipeline, $} = require('moonriver'));

  ({after, defer, sleep} = GUY.async);

  _debounce = require('debounce');

  debounce = function(dts, f) {
    return _debounce(f, dts * 1000, false);
  };

  file_dt = 0.2; // seconds to sleep between file actions

  ({Intersock} = require('intersock'));

  //...........................................................................................................
  G = {};

  (function() {
    G.project_path = PATH.dirname(__dirname);
    return G.public_path = PATH.join(G.project_path, 'public');
  })();

  //===========================================================================================================
  xxx = {
    //---------------------------------------------------------------------------------------------------------
    $log_all: function() {
      return (d) => {}; // whisper GUY.datetime.now(), '^345-1^', 'pipeline', d
    },
    
    //---------------------------------------------------------------------------------------------------------
    $add_as_change: function() {
      return (d, send) => {
        if (d.key === 'add') {
          d.key = 'change';
        }
        return send(d);
      };
    },
    //---------------------------------------------------------------------------------------------------------
    $add_file_info: function() {
      return (d, send) => {
        var e;
        if (d.path == null) {
          return send(d);
        }
        e = PATH.parse(d.path);
        d.home = e.dir;
        d.filename = e.base;
        d.extension = e.ext;
        d.barename = e.name;
        return send(d);
      };
    },
    //---------------------------------------------------------------------------------------------------------
    $browserify_mudom_etc: async function() {
      /* TAINT make debounce_dts configurable */
      var debounce_dts, run_browserify, zx;
      ({
        $: zx
      } = (await import('zx')));
      run_browserify = debounce(debounce_dts, async function() {
        return (await zx`bin/run-browserify`);
      });
      debounce_dts = 0.1;
      return async(d) => {
        var error, message, ref;
        if (!/\/node_modules\/(linefinder|mudom|intersock|webguy)\/lib\//.test(d.path)) {
          return null;
        }
        try {
          /* TAINT rewrite by using functions that call `zx`, catch errors, wait */
          await run_browserify();
        } catch (error1) {
          error = error1;
          message = (ref = error.message) != null ? ref : error;
          warn('^$browserify_mudom_etc@345-3^', GUY.trm.reverse(` ${message} `));
        }
        return null;
      };
    },
    //---------------------------------------------------------------------------------------------------------
    $html_from_md: async function() {
      var zx;
      ({
        $: zx
      } = (await import('zx')));
      return (d, send) => {
        var public_filename, public_path, source_path;
        if (d.key !== 'change') {
          return send(d);
        }
        if (d.extension !== '.md') {
          return send(d);
        }
        //.....................................................................................................
        source_path = d.path;
        public_filename = `${d.barename}.html`;
        public_path = PATH.join(G.public_path, public_filename);
        help(GUY.datetime.now(), '^$html_from_md@345-2^', GUY.trm.reverse(` ${d.filename} -> ${public_filename} `));
        //.....................................................................................................
        GUY.temp.with_directory({
          prefix: 'lfxaiif'
        }, async function({
            path: tmp_dir_path
          }) {
          var error, message, ref, ref1, tmp_path;
          tmp_path = PATH.join(tmp_dir_path, public_filename);
          try {
            /* TAINT rewrite by using functions that call `zx`, catch errors, wait */
            await zx`pandoc -o ${tmp_path} ${source_path}`;
          } catch (error1) {
            error = error1;
            message = (ref = error.message) != null ? ref : error;
            warn('^$html_from_md@345-3^', GUY.trm.reverse(` ${message} `));
          }
          try {
            //...................................................................................................
            await zx`echo '<!DOCTYPE html>' | cat - ${tmp_path} > ${public_path}`;
          } catch (error1) {
            error = error1;
            message = (ref1 = error.message) != null ? ref1 : error;
            warn('^$html_from_md@345-4^', GUY.trm.reverse(` ${message} `));
          }
          return (await sleep(file_dt));
        });
        //.....................................................................................................
        info(GUY.datetime.now(), '^$html_from_md@345-5^', GUY.trm.reverse(` OK ${d.filename} -> ${public_filename} `));
        // date +"%Y-%m-%d %H:%M:%S"
        //.....................................................................................................
        return null;
      };
    },
    //---------------------------------------------------------------------------------------------------------
    $reload: function(server) {
      return (d) => {
        server.reloadBrowserWindow();
        return null;
      };
    }
  };

  //===========================================================================================================
  create_pipeline = async function(server) {
    var pipeline;
    pipeline = new Async_pipeline();
    pipeline.push((await xxx.$log_all()));
    pipeline.push((await xxx.$add_as_change()));
    pipeline.push((await xxx.$add_file_info()));
    pipeline.push((await xxx.$browserify_mudom_etc()));
    pipeline.push((await xxx.$html_from_md()));
    pipeline.push((await xxx.$reload(server)));
    return pipeline;
  };

  //===========================================================================================================
  My_watcher = class My_watcher extends GUY.watch.Watcher {
    //---------------------------------------------------------------------------------------------------------
    constructor(pipeline) {
      super(); // { ignored: /(^|\/)\..|node_modules/, }
      this.pipeline = pipeline;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    async on_all(key, path = null) {
      var d, ref;
      if (path == null) {
        return null;
      }
      whisper(GUY.datetime.now(), '^345-7^', GUY.trm.reverse('my_watcher', key, path));
      this.pipeline.send({key, path});
      ref = this.pipeline.walk();
      for await (d of ref) {
        null;
      }
      return null;
    }

  };

  //-----------------------------------------------------------------------------------------------------------
  demo = function() {
    return new Promise(async(resolve, reject) => {
      var FiveServer, cfg, intersock, mode, pipeline, server, watcher;
      mode = (process.argv.at(-1)) === 'dev' ? 'dev' : 'prod';
      FiveServer = (require('five-server')).default;
      cfg = {
        open: false,
        root: './public',
        host: '0.0.0.0',
        ignore: /.*/,
        https: true,
        wait: 1000 // ms
      };
      server = new FiveServer();
      pipeline = (await create_pipeline(server));
      watcher = new My_watcher(pipeline);
      watcher.add_path(PATH.join(G.project_path, 'pages/**/*.md'));
      watcher.add_path(PATH.join(G.project_path, 'public/**/*.css'));
      watcher.add_path(PATH.join(G.project_path, 'public/**/*.js'));
      watcher.add_path(PATH.join(G.project_path, 'public/**/*.html'));
      if (mode === 'dev') {
        warn(GUY.trm.reverse('^demo@345-1^', "running in dev mode"));
        watcher.add_path(PATH.resolve(PATH.join(G.project_path, 'node_modules/mudom/lib/*.js')));
        watcher.add_path(PATH.resolve(PATH.join(G.project_path, 'node_modules/linefinder/lib/*.js')));
        watcher.add_path(PATH.resolve(PATH.join(G.project_path, 'node_modules/intersock/lib/*.js')));
        watcher.add_path(PATH.resolve(PATH.join(G.project_path, 'node_modules/webguy/lib/*.js')));
      } else {
        /* TAINT should be included per intersock */        help(GUY.trm.reverse('^demo@345-1^', "running in prod mode"));
      }
      await server.start(cfg);
      // debug '^2344^', server
      // debug '^2344^', server.httpServer # k for k in GUY.props.keys server, { hidden: true, }
      // debug '^2344^', k for k in GUY.props.keys server, { hidden: true, }
      intersock = new Intersock();
      // debug '^2394789^', intersock
      server.reloadBrowserWindow();
      return resolve();
    });
  };

  //###########################################################################################################
  if (require.main === module) {
    (async() => {
      return (await demo());
    })();
  }

  // await demo_zx()

}).call(this);

//# sourceMappingURL=watcher.js.map