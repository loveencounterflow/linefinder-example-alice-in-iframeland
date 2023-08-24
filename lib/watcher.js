(function() {
  'use strict';
  var $, Async_pipeline, FS, G, GUY, My_watcher, PATH, Pipeline, after, alert, create_pipeline, debug, defer, demo, echo, file_dt, help, info, inspect, log, plain, praise, rpr, sleep, urge, warn, whisper, xxx;

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

  file_dt = 0.2; // seconds to sleep between file actions

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
      return (d) => {
        return whisper(GUY.datetime.now(), '^858-4^', 'pipeline', d);
      };
    },
    //---------------------------------------------------------------------------------------------------------
    $add_as_change: function() {
      return (d, send) => {
        if (d.key !== 'add') {
          send(d);
        }
        d.key = 'change';
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
    $html_from_md: function() {
      return async(d, send) => {
        var public_filename, public_path, source_path, zx;
        if (d.key !== 'change') {
          return send(d);
        }
        if (d.extension !== '.md') {
          return send(d);
        }
        ({
          //.......................................................................................................
          $: zx
        } = (await import('zx')));
        source_path = d.path;
        public_filename = `${d.barename}.html`;
        public_path = PATH.join(G.public_path, public_filename);
        help(GUY.datetime.now(), '^$html_from_md@858-1^', GUY.trm.reverse(` ${d.filename} -> ${public_filename} `));
        //.......................................................................................................
        GUY.temp.with_directory(async function({
            path: tmp_dir_path
          }) {
          var error, file_exists, message, ref, ref1, ref2, tmp_path, xxx_count;
          tmp_path = PATH.join(tmp_dir_path, public_filename);
          try {
            /* TAINT rewrite by using functions that call `zx`, catch errors, wait */
            await zx`pandoc -o ${tmp_path} ${source_path}`;
          } catch (error1) {
            error = error1;
            message = (ref = error.message) != null ? ref : error;
            warn('^$html_from_md@858-2^', GUY.trm.reverse(` ${message} `));
          }
          debug('^345-1^', "###################################");
          xxx_count = 0;
          while (true) {
            xxx_count++;
            if (xxx_count > 100/* TAINT display error */) {
              break;
            }
            file_exists = FS.existsSync(tmp_path);
            debug('^345-11^', file_exists);
            if (file_exists) {
              break;
            }
            await sleep(file_dt);
          }
          try {
            //.......................................................................................................
            await zx`echo '<!DOCTYPE html>' | cat - ${tmp_path} > ${public_path}`;
          } catch (error1) {
            error = error1;
            message = (ref1 = error.message) != null ? ref1 : error;
            warn('^$html_from_md@858-3^', GUY.trm.reverse(` ${message} `));
          }
          debug('^345-3^', "###################################");
          await sleep(file_dt);
          debug('^345-4^', FS.existsSync(public_path));
          try {
            //.......................................................................................................
            /* TAINT use GUY temp file */
            await zx`trash ${tmp_path}`;
          } catch (error1) {
            error = error1;
            message = (ref2 = error.message) != null ? ref2 : error;
            warn('^$html_from_md@858-4^', GUY.trm.reverse(` ${message} `));
          }
          debug('^345-5^', "###################################");
          return (await sleep(file_dt));
        });
        //.......................................................................................................
        info(GUY.datetime.now(), '^$html_from_md@858-5^', GUY.trm.reverse(` OK ${d.filename} -> ${public_filename} `));
        // date +"%Y-%m-%d %H:%M:%S"
        //.......................................................................................................
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
  create_pipeline = function(server) {
    var pipeline;
    pipeline = new Async_pipeline();
    // pipeline.push ( d ) -> warn GUY.datetime.now(), '^858-4^', 'pipeline', d
    pipeline.push(xxx.$log_all());
    pipeline.push(xxx.$add_as_change());
    pipeline.push(xxx.$add_file_info());
    // pipeline.push xxx.$log_all()
    pipeline.push(xxx.$html_from_md());
    pipeline.push(xxx.$reload(server));
    return pipeline;
  };

  //===========================================================================================================
  My_watcher = class My_watcher extends GUY.watch.Watcher {
    //---------------------------------------------------------------------------------------------------------
    constructor(pipeline) {
      super({
        ignored: /(^|\/)\..|node_modules/
      });
      this.pipeline = pipeline;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    async on_all(key, path) {
      var d, ref;
      // whisper GUY.datetime.now(), '^858-1^', 'my_watcher', key, path
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
    return new Promise((resolve, reject) => {
      var FiveServer, cfg, pipeline, server, watcher;
      FiveServer = (require('five-server')).default;
      cfg = {
        open: false,
        root: './public',
        host: '0.0.0.0',
        ignore: /.*/,
        https: true,
        wait: 1000 // ms
      };
      // debug '^43457640^', k for k from GUY.props.walk_keys ( new FiveServer()), { hidden: true, }
      server = new FiveServer();
      pipeline = create_pipeline(server);
      watcher = new My_watcher(pipeline);
      watcher.add_path(PATH.join(G.project_path, 'pages/**/*.md'));
      watcher.add_path(PATH.join(G.project_path, 'public/**/*.css'));
      watcher.add_path(PATH.join(G.project_path, 'public/**/*.js'));
      watcher.add_path(PATH.join(G.project_path, 'public/**/*.html'));
      server.start(cfg);
      server.reloadBrowserWindow();
      return resolve();
    });
  };

  // demo = -> new Promise ( resolve, reject ) =>
  //   debug '^345-6^', "###################################"
  //   await sleep file_dt
  //   debug '^345-7^', "###################################"
  //   await sleep file_dt
  //   debug '^345-8^', "###################################"
  //   await sleep file_dt
  //   debug '^345-9^', "###################################"
  //   await sleep file_dt
  //   resolve()

  //###########################################################################################################
  if (require.main === module) {
    (async() => {
      return (await demo());
    })();
  }

  // await demo_zx()

}).call(this);

//# sourceMappingURL=watcher.js.map