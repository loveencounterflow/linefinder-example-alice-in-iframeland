(function() {
  'use strict';
  var LINE, µ;

  //===========================================================================================================
  globalThis.log = console.log;

  globalThis.debug = console.debug;

  µ = require('mudom');

  LINE = require('linefinder');

  // _Distributor = LINE.Distributor

  // LINE.Distributor = class extends _Distributor

  //   constructor: ( cfg ) ->
  //     super cfg
  //     @rightcomb = µ.DOM.parse_one '<mu-rightcomb></mu-rightcomb>'
  //     log '^342234^', "Distributor", @rightcomb
  //     return undefined

  //===========================================================================================================
  µ.DOM.ready(async function() {
    var cfg, distributor;
    log('^123-1^', "ready");
    cfg = {
      paragraph_selector: 'mu-galley > p',
      iframe_selector: 'iframe',
      insert_stylesheet_after: 'link[href$="reset.css"]',
      insert_debug_button: true,
      insert_paginate_button: true
    };
    //.........................................................................................................
    if ((!µ.DOM.page_is_inside_iframe()) && ((µ.DOM.select_first('mu-galley', null)) != null)) {
      log('^123-1^', "galley page, not inside an iframe");
      distributor = new LINE.Distributor(cfg);
      await distributor.mark_lines();
      return null;
    }
    if (!LINE.Distributor.is_main_document()) {
      //.........................................................................................................
      return null;
    }
    //.........................................................................................................
    distributor = new LINE.Distributor(cfg);
    // await distributor.distribute_lines()
    /* TAINT to be done in `linefinder` */
    // globalThis.ws = new ( require 'intersock' ).Intersock()
    return null;
  });

}).call(this);

//# sourceMappingURL=ops2.js.map