
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
file_dt                   = 0.2 # seconds to sleep between file actions
#...........................................................................................................
G                         = {}
do ->
  G.project_path  = PATH.dirname __dirname
  G.public_path   = PATH.join G.project_path, 'public'


#===========================================================================================================
xxx =

  #---------------------------------------------------------------------------------------------------------
  $log_all: -> ( d ) => whisper GUY.datetime.now(), '^858-4^', 'pipeline', d

  #---------------------------------------------------------------------------------------------------------
  $add_as_change: -> ( d, send ) =>
    send d unless d.key is 'add'
    d.key = 'change'
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
  $html_from_md: -> ( d, send ) =>
    return send d unless d.key is 'change'
    return send d unless d.extension is '.md'
    #.......................................................................................................
    { $: zx }       = await import( 'zx' )
    source_path     = d.path
    public_filename = "#{d.barename}.html"
    public_path     = PATH.join G.public_path,  public_filename
    help GUY.datetime.now(), '^$html_from_md@858-1^', GUY.trm.reverse " #{d.filename} -> #{public_filename} "
    #.......................................................................................................
    GUY.temp.with_directory ({ path: tmp_dir_path }) ->
      tmp_path        = PATH.join tmp_dir_path,     public_filename
      ### TAINT rewrite by using functions that call `zx`, catch errors, wait ###
      try
        await zx"""pandoc -o #{tmp_path} #{source_path}"""
      catch error
        message = error.message ? error
        warn '^$html_from_md@858-2^', GUY.trm.reverse " #{message} "
      debug '^345-1^', "###################################"
      xxx_count = 0
      loop
        xxx_count++
        break if xxx_count > 100 ### TAINT display error ###
        file_exists = FS.existsSync tmp_path
        debug '^345-11^', file_exists
        break if file_exists
        await sleep file_dt
      #.......................................................................................................
      try
        await zx"""echo '<!DOCTYPE html>' | cat - #{tmp_path} > #{public_path}"""
      catch error
        message = error.message ? error
        warn '^$html_from_md@858-3^', GUY.trm.reverse " #{message} "
      debug '^345-3^', "###################################"
      await sleep file_dt
      debug '^345-4^', FS.existsSync public_path
      #.......................................................................................................
      ### TAINT use GUY temp file ###
      try
        await zx"""trash #{tmp_path}"""
      catch error
        message = error.message ? error
        warn '^$html_from_md@858-4^', GUY.trm.reverse " #{message} "
      debug '^345-5^', "###################################"
      await sleep file_dt
    #.......................................................................................................
    info GUY.datetime.now(), '^$html_from_md@858-5^', GUY.trm.reverse " OK #{d.filename} -> #{public_filename} "
      # date +"%Y-%m-%d %H:%M:%S"
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  $reload: ( server ) -> ( d ) =>
    server.reloadBrowserWindow()
    return null

#===========================================================================================================
create_pipeline = ( server ) ->
  pipeline        = new Async_pipeline()
  # pipeline.push ( d ) -> warn GUY.datetime.now(), '^858-4^', 'pipeline', d
  pipeline.push xxx.$log_all()
  pipeline.push xxx.$add_as_change()
  pipeline.push xxx.$add_file_info()
  # pipeline.push xxx.$log_all()
  pipeline.push xxx.$html_from_md()
  pipeline.push xxx.$reload server
  return pipeline


#===========================================================================================================
class My_watcher extends GUY.watch.Watcher

  #---------------------------------------------------------------------------------------------------------
  constructor: ( pipeline ) ->
    super { ignored: /(^|\/)\..|node_modules/, }
    @pipeline = pipeline
    return undefined

  #---------------------------------------------------------------------------------------------------------
  on_all: ( key, path ) ->
    # whisper GUY.datetime.now(), '^858-1^', 'my_watcher', key, path
    @pipeline.send { key, path, }
    null for await d from @pipeline.walk()
    return null

#-----------------------------------------------------------------------------------------------------------
demo = -> new Promise ( resolve, reject ) =>
  FiveServer = ( require 'five-server' ).default
  cfg =
    open:           false
    root:           './public'
    host:           '0.0.0.0'
    ignore:         /.*/
    https:          true
    wait:           1000 # ms
  # debug '^43457640^', k for k from GUY.props.walk_keys ( new FiveServer()), { hidden: true, }
  server      = new FiveServer()
  pipeline    = create_pipeline server
  watcher     = new My_watcher pipeline
  watcher.add_path PATH.join G.project_path, 'pages/**/*.md'
  watcher.add_path PATH.join G.project_path, 'public/**/*.css'
  watcher.add_path PATH.join G.project_path, 'public/**/*.js'
  watcher.add_path PATH.join G.project_path, 'public/**/*.html'
  server.start cfg
  server.reloadBrowserWindow()
  return resolve()

# demo = -> new Promise ( resolve, reject ) =>
#   debug '^345-6^', "###################################"
#   await sleep file_dt
#   debug '^345-7^', "###################################"
#   await sleep file_dt
#   debug '^345-8^', "###################################"
#   await sleep file_dt
#   debug '^345-9^', "###################################"
#   await sleep file_dt
#   resolve()

############################################################################################################
if require.main is module then do =>
  await demo()
  # await demo_zx()

