
'use strict'


############################################################################################################
GUY                       = require 'guy'
{ alert
  debug
  help
  info
  plain
  praise
  urge
  warn
  whisper }               = GUY.trm.get_loggers 'GUY/temp/tests'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
#...........................................................................................................
PATH                      = require 'path'
FS                        = require 'fs'
# { freeze }                = require 'letsfreezethat'
# H                         = require './helpers'
# types                     = new ( require 'intertype' ).Intertype()
# { isa
#   declare
#   type_of
#   validate
#   equals }                = types
{ Pipeline
  Async_pipeline
  $         }             = require 'moonriver'
{ after
  defer
  sleep }                 = GUY.async
_debounce                 = require 'debounce';
debounce                  = ( dts, f ) -> _debounce f, dts * 1000, false
file_dt                   = 0.2 # seconds to sleep between file actions
{ Intersock }             = require 'intersock'
#...........................................................................................................
G                         = {}
do ->
  G.project_path  = PATH.dirname __dirname
  G.public_path   = PATH.join G.project_path, 'public'


#===========================================================================================================
xxx =

  #---------------------------------------------------------------------------------------------------------
  $log_all: -> ( d ) => # whisper GUY.datetime.now(), '^345-1^', 'pipeline', d

  #---------------------------------------------------------------------------------------------------------
  $add_as_change: -> ( d, send ) =>
    d.key = 'change' if d.key is 'add'
    send d

  #---------------------------------------------------------------------------------------------------------
  $add_file_info: -> ( d, send ) =>
    return send d unless d.path?
    e           = PATH.parse d.path
    d.home      = e.dir
    d.filename  = e.base
    d.extension = e.ext
    d.barename  = e.name
    send d

  #---------------------------------------------------------------------------------------------------------
  $browserify_mudom_etc: ->
    { $: zx }       = await import( 'zx' )
    run_browserify  = debounce debounce_dts, -> await zx"""bin/run-browserify"""
    ### TAINT make debounce_dts configurable ###
    debounce_dts    = 0.1
    return ( d ) =>
      return null unless /\/node_modules\/(linefinder|mudom|intersock|webguy)\/lib\//.test d.path
      ### TAINT rewrite by using functions that call `zx`, catch errors, wait ###
      try
        await run_browserify()
      catch error
        message = error.message ? error
        warn '^$browserify_mudom_etc@345-3^', GUY.trm.reverse " #{message} "
      return null

  #---------------------------------------------------------------------------------------------------------
  $html_from_md: ->
    { $: zx } = await import( 'zx' )
    return ( d, send ) =>
      return send d unless d.key is 'change'
      return send d unless d.extension is '.md'
      #.....................................................................................................
      source_path     = d.path
      public_filename = "#{d.barename}.html"
      public_path     = PATH.join G.public_path,  public_filename
      help GUY.datetime.now(), '^$html_from_md@345-2^', GUY.trm.reverse " #{d.filename} -> #{public_filename} "
      #.....................................................................................................
      GUY.temp.with_directory { prefix: 'lfxaiif', }, ({ path: tmp_dir_path }) ->
        tmp_path        = PATH.join tmp_dir_path,     public_filename
        ### TAINT rewrite by using functions that call `zx`, catch errors, wait ###
        try
          await zx"""pandoc -o #{tmp_path} #{source_path}"""
        catch error
          message = error.message ? error
          warn '^$html_from_md@345-3^', GUY.trm.reverse " #{message} "
        #...................................................................................................
        try
          await zx"""echo '<!DOCTYPE html>' | cat - #{tmp_path} > #{public_path}"""
        catch error
          message = error.message ? error
          warn '^$html_from_md@345-4^', GUY.trm.reverse " #{message} "
        await sleep file_dt
      #.....................................................................................................
      info GUY.datetime.now(), '^$html_from_md@345-5^', GUY.trm.reverse " OK #{d.filename} -> #{public_filename} "
        # date +"%Y-%m-%d %H:%M:%S"
      #.....................................................................................................
      return null

  #---------------------------------------------------------------------------------------------------------
  $reload: ( server ) -> ( d ) =>
    server.reloadBrowserWindow()
    return null

#===========================================================================================================
create_pipeline = ( server ) ->
  pipeline        = new Async_pipeline()
  pipeline.push await xxx.$log_all()
  pipeline.push await xxx.$add_as_change()
  pipeline.push await xxx.$add_file_info()
  pipeline.push await xxx.$browserify_mudom_etc()
  pipeline.push await xxx.$html_from_md()
  pipeline.push await xxx.$reload server
  return pipeline


#===========================================================================================================
class My_watcher extends GUY.watch.Watcher

  #---------------------------------------------------------------------------------------------------------
  constructor: ( pipeline ) ->
    super() # { ignored: /(^|\/)\..|node_modules/, }
    @pipeline = pipeline
    return undefined

  #---------------------------------------------------------------------------------------------------------
  on_all: ( key, path = null ) ->
    return null unless path?
    whisper GUY.datetime.now(), '^345-7^', GUY.trm.reverse 'my_watcher', key, path
    @pipeline.send { key, path, }
    null for await d from @pipeline.walk()
    return null

#-----------------------------------------------------------------------------------------------------------
demo = -> new Promise ( resolve, reject ) =>
  mode = if ( process.argv.at -1 ) is 'dev' then 'dev' else 'prod'
  FiveServer = ( require 'five-server' ).default
  cfg =
    open:           false
    root:           './public'
    host:           '0.0.0.0'
    ignore:         /.*/
    https:          true
    wait:           1000 # ms
  server      = new FiveServer()
  pipeline    = await create_pipeline server
  watcher     = new My_watcher pipeline
  watcher.add_path PATH.join G.project_path, 'pages/**/*.md'
  watcher.add_path PATH.join G.project_path, 'public/**/*.css'
  watcher.add_path PATH.join G.project_path, 'public/**/*.js'
  watcher.add_path PATH.join G.project_path, 'public/**/*.html'
  if mode is 'dev'
    warn GUY.trm.reverse '^demo@345-1^', "running in dev mode"
    watcher.add_path PATH.resolve PATH.join G.project_path, 'node_modules/mudom/lib/*.js'
    watcher.add_path PATH.resolve PATH.join G.project_path, 'node_modules/linefinder/lib/*.js'
    watcher.add_path PATH.resolve PATH.join G.project_path, 'node_modules/intersock/lib/*.js'
    watcher.add_path PATH.resolve PATH.join G.project_path, 'node_modules/webguy/lib/*.js' ### TAINT should be included per intersock ###
  else
    help GUY.trm.reverse '^demo@345-1^', "running in prod mode"
  await server.start cfg
  # debug '^2344^', server
  # debug '^2344^', server.httpServer # k for k in GUY.props.keys server, { hidden: true, }
  # debug '^2344^', k for k in GUY.props.keys server, { hidden: true, }
  intersock   = new Intersock()
  # debug '^2394789^', intersock
  server.reloadBrowserWindow()
  return resolve()




############################################################################################################
if require.main is module then do =>
  await demo()
  # await demo_zx()

