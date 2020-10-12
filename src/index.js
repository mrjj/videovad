const fs = require('fs')
const path = require('path')
// const fetch = require("node-fetch");
// const FetchProgress = require("node-fetch-progress");
const youtubeDownload = require('youtube-dl')
const mkdirp = require('mkdirp')
const shellEscape = require('any-shell-escape')
const {exec} = require('child_process')
const VAD = require("node-vad");
const ffmpegPath = require('ffmpeg-static');
const {cpMap} = require("./promises");
const ffprobePath = require('ffprobe-static').path;

const TSV_EXTENSION = 'tsv'
const DEFAULT_NUMBER_OF_CHANNELS = 1;

const EVENT_SPEECH = `SPEECH`

const FETCH_PROGRESS_THROTTLE_MS = 1000
const VAD_DEBOUNCE_TIME_MS = 300
const DEFAULT_AUDIO_SAMPLE_RATE = 16000
const DEFAULT_VAD_MODE = VAD.Mode.NORMAL
const DEFAULT_TARGET_TIME_SEC = 6;
const OUTPUT_TIME_PRECISION = 3;

const DEFAULT_INPUT_FILES_LIST_PATH = path.join(__dirname, '../data/input.txt')
const DEFAULT_PROCESSING_DIR = path.join(__dirname, '../data/tmp')
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '../data/output')

const VAD_FILE_HEADER = [
  'id',
  'event',
  `start`,
  `end`,
  `duration`,
  'unit',
  'file'
]

const vadDataToMpegMetadata = (vadData) => {
  let chapters = '№ NO DATA WAS PROVIDED';
  if (vadData.length > 0) {
    chapters = vadData.map(
      ({start, end, id, unit}) => `
[CHAPTER]
TIMEBASE=1/1
START=${start}
END=${end}
title=Speech range #${id}`
    ).join('')
  }
  return [
    ';FFMETADATA1',
    `title=${vadData[0].file} VAD`,
    chapters
  ].join('\n')
};

const vadDataToTsv = (vadData, fields = VAD_FILE_HEADER) => [
  fields,
  ...vadData.map(
    row => fields.map(field => row[field])
  )
].map(
  v => `${v.join('\t')}\n`
).join('');

const getDurationSec = async (mediaPath) => new Promise(
  (resolve, reject) => {
    process.stderr.write(`${mediaPath} -[duration]-> `)
    const ffprobeCmd = shellEscape([
      path.relative(process.cwd(), ffprobePath),
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      mediaPath
    ])
    exec(ffprobeCmd, (err, stdout, stderr) => {
      if (process.env.DEBUG) {
        process.stderr.write(` - $ ${ffprobeCmd}`)
      }
      if (err) {
        process.stderr.write(` - ERROR: ${err.message}\n${err.stack}\n\n`)
        reject(err)
      } else {
        resolve(parseFloat(stdout))
      }
    })
  }
)
const produceSegments = (mediaPath, metadataPath, timesSec, outputPath) => new Promise(
  (resolve, reject) => {
    const cmdStr = shellEscape([
      path.relative(process.cwd(), ffmpegPath),
      '-y',
      '-v', 'info',
      '-i', mediaPath,
      '-i', metadataPath,

      '-map_metadata', '1',
      '-map_chapters', '1',

      '-hls_segment_type', 'fmp4',
      '-hls_flags', 'single_file',
      '-segment_list_type', 'm3u8',
      '-segment_time_delta', '0.05',
      // '-codec', 'copy',
      '-codec:v', 'mpeg4',
      '-codec:a', 'pcm_s16le',

      '-map', '0',
      '-f', 'segment',
      '-segment_list', outputPath,

      '-segment_times', timesSec.join(','),
      '-force_key_frames', timesSec.join(','),

      `${outputPath.replace(/\.[^.]+$/ui, '')}-%04d.ts`,
    ])
    process.stderr.write(`$ ${cmdStr}\n`)
    exec(
      cmdStr,
      {timeout: 8 * 60 * 60 * 1000},
      (err, stdout, stderr) => {
        if (err) {
          process.stderr.write(`ERROR: ${err.message}\n${err.stack}\nSTDERR>\n${stderr}\n`)
          reject(err)
        } else {
          resolve()
        }
      }
    )
  }
)

const videoToAudio = async (
  videoPath,
  audioSampleRate = DEFAULT_AUDIO_SAMPLE_RATE,
  offsetSec = null,
  limitSec = null,
  audioChannels = DEFAULT_NUMBER_OF_CHANNELS,
) => {
  const duration = Math.floor(await getDurationSec(videoPath)); // FIXME: avoid sub-second tailcut
  // const slices = for ( )
  return cpMap(
    [
      {
        extension: 'raw',
        acodec: 'pcm_s16le',
        format: 's16le'
      },
      {
        extension: 'wav',
        acodec: 'pcm_u8',
        format: 'wav'
      },
    ],
    async ({extension, acodec, format}) => {
      const extensionSuffix = extension.replace(/^[.]?/uig, '.')
      const startSec = offsetSec || 0;
      const endSec = limitSec ? ((offsetSec || 0) + (limitSec || 0)) : '';

      const audioPath = videoPath.replace(/\.[^.\/]+$/ui, `${startSec ? `-${startSec}` : ''}${endSec ? `-${endSec}` : ''}${extensionSuffix}`);
      process.stderr.write(`${videoPath} -[audio:${audioChannels}]-> ${path.relative(process.cwd(), audioPath)}`)
      if (fs.existsSync(audioPath)) {
        process.stderr.write(' - Target already exists - Done\n')
        return audioPath
      }
      process.stderr.write(` - using ffmepg ${path.relative(process.cwd(), ffmpegPath)}`)
      const shellCmd = [
        ffmpegPath,//path.relative(process.cwd(), ffmpegPath),
        '-y',
        '-v', 'error',
        '-i', videoPath,
        ...(acodec ? ['-acodec', acodec] : []),
        ...(format ? ['-f', format] : []),
        '-ac', audioChannels,
        '-ar', audioSampleRate,
        ...(offsetSec ? ['-ss', offsetSec] : []),
        ...(limitSec ? ['-to', (offsetSec || 0) + limitSec] : ['-to', duration]),
        audioPath,
      ]
      console.error('\n', shellCmd.join(' '))
      const ffmpegCmd = shellEscape(shellCmd)
      if (!fs.existsSync(path.dirname(audioPath))) {
        process.stderr.write(` - Making folder ${path.relative(process.cwd(), audioPath)}`)
      }
      if (process.env.DEBUG) {
        process.stderr.write(` - $ ${ffmpegCmd}`);
      }
      return new Promise((resolve, reject) => {

        exec(
          ffmpegCmd,
          (err, stdout, stderr) => {
            if (err) {
              process.stderr.write(` - ERROR: ${err.message}\n${err.stack}`)
              reject(err)
            } else {
              process.stderr.write('Done!\n')
              resolve(audioPath)
            }
          }
        )
      })
    }
  );
}

const downloadYoutube = (
  youtubeUrl,
  outputDir = DEFAULT_OUTPUT_DIR
) => new Promise(
  (resolve, reject) => {

    const video = youtubeDownload(
      youtubeUrl,
      // Optional arguments passed to youtube-dl.
      ['--format=18', '--audio-format=best'],
      // Additional options can be given for calling `child_process.execFile()`.
      {cwd: __dirname}
    )
    let youtubeHash = youtubeUrl.match(/[?&]v=([^&]+)/uig)
    youtubeHash = Array.isArray(youtubeHash) ? youtubeHash[0].split('=')[1] : `unidentified`
    const outputPath = path.join(outputDir, `${youtubeHash}.mp4`)
    process.stderr.write(`${youtubeUrl} -[download]-> ${path.relative(process.cwd(), outputPath)}`)
    if (!fs.existsSync(outputPath)) {
      if (!fs.existsSync(path.dirname(outputPath))) {
        mkdirp.sync(path.dirname(outputPath))
      }
      video.on('info', (info) => process.stderr.write(` - Download of ${info.size} bytes started`))

      video.pipe(fs.createWriteStream(outputPath))
      video.on('error', (err) => reject(err))
      video.on('end', () => {
        process.stderr.write('Done!\n')
        resolve(outputPath);
      })
    } else {
      process.stderr.write(`Target already exists - Done!\n`)
      resolve(outputPath);
    }
  }
)
const vadFromStream = (
  inputStream,
  sampleRate,
  numberOfChannels = DEFAULT_NUMBER_OF_CHANNELS,
  vadMode = DEFAULT_VAD_MODE,
) => new Promise(
  (resolve, reject) => {
    const vadData = [];
    const castTime = t => t / 1000;
    const vadStream = VAD.createStream({
      mode: vadMode,
      audioFrequency: sampleRate,
      debounceTime: VAD_DEBOUNCE_TIME_MS,
    });
    vadStream.on('error', (err) => {
      process.stderr.write(`ERROR: ${err}\n`)
      reject(err)
    })
    vadStream.on("end", () => {
      resolve(vadData)
    });
    let id = 1;
    let started = null;
    const timeScale = 1 / 1000;
    inputStream.pipe(vadStream).on("data", (vadRec) => {
      // console.error('vadRec.speech', vadRec.speech)
      if (vadRec.speech) {
        if (vadRec.speech.start) {
          started = vadRec.speech.startTime
        } else if (vadRec.speech.end && (started !== null)) {
          vadData.push({
            id,
            event: EVENT_SPEECH,
            start: started * timeScale,
            end: vadRec.time * timeScale,
            duration: (vadRec.time - started) * timeScale,
            unit: 'second'
          });
          started = null;
          id += 1;
        }
      } else {
        // Fixme: Add non-speech cases
      }
    });
  }
);

const vadDataToTimes = (vadData, targetTimeSec = DEFAULT_TARGET_TIME_SEC) => {
  return vadData.reduce(
    (a, {start, end}) => {
      for (let ts = start; ts < end; ts += targetTimeSec) {
        a.push(parseFloat(ts.toFixed(OUTPUT_TIME_PRECISION)));
      }
      return a;
    },
    []
  );
}

const processFile = async (
  inputUrlOrPath,
  outputDir,
  vadMode = DEFAULT_VAD_MODE,
  sampleRate = DEFAULT_AUDIO_SAMPLE_RATE,
  numberOfChannels = DEFAULT_NUMBER_OF_CHANNELS,
  targetTimeSec = DEFAULT_TARGET_TIME_SEC,
) => {
  const videoPath = await downloadYoutube(inputUrlOrPath, outputDir);

  const audioPaths = await videoToAudio(videoPath, sampleRate, null, null, 1)
  const audioPath = audioPaths.filter(v => v.match(/\.raw$/ui))[0] || '/tmp/audio.raw'

  const sizeBytes = fs.statSync(audioPath).size

  const rs = fs.createReadStream(audioPath)
  const vadData = await vadFromStream(
    rs,
    sampleRate,
    numberOfChannels,
    vadMode,
  )

  const vadPath = audioPath.replace(/\.[^.\/]+$/ui, `.vad.${TSV_EXTENSION}`)
  process.stderr.write(`${path.relative(process.cwd(), audioPath)} (${sizeBytes} bytes)-[vad, sr: ${sampleRate}]-> ${path.relative(process.cwd(), vadPath)} `)
  fs.writeFileSync(vadPath, vadDataToTsv(vadData, VAD_FILE_HEADER), 'utf-8')
  process.stderr.write(`Done\n`)

  const metadataPath = audioPath.replace(/\.[^.\/]+$/ui, `.metadata.txt`);
  process.stderr.write(`${path.relative(process.cwd(), vadPath)} -[MPEG Metadata with VAD based chapters] -> ${path.relative(process.cwd(), metadataPath)} `)
  fs.writeFileSync(metadataPath, vadDataToMpegMetadata(vadData), 'utf-8');
  process.stderr.write(`Done\n`);

  const m3u8FilePath = videoPath.replace(/([^\/\\]+)(\.[^.]*)$/ui, '$1/$1.m3u8');
  mkdirp(path.dirname(m3u8FilePath));
  process.stderr.write(`${videoPath} + ${metadataPath} -[final output]-> ${m3u8FilePath}\n`)
  const times = vadDataToTimes(vadData, targetTimeSec);
  await produceSegments(videoPath, metadataPath, times, m3u8FilePath);
  process.stderr.write(`Done!\n`);

  return m3u8FilePath
}

const run = (
  inputFilesListPath = DEFAULT_INPUT_FILES_LIST_PATH,
  outputDir = DEFAULT_OUTPUT_DIR,
  vadMode = DEFAULT_VAD_MODE
) => cpMap(
  fs.readFileSync(path.resolve(inputFilesListPath), 'utf-8')
    .split('\n')
    .map(v => v.trim().split(' ')[0])
    .filter(v => (!!v) && (!v.startsWith('//'))),
  inputFilePath => processFile(inputFilePath, outputDir, vadMode)
);

run(
  process.argv[2] || DEFAULT_INPUT_FILES_LIST_PATH,
  process.argv[3] || DEFAULT_OUTPUT_DIR,
  DEFAULT_VAD_MODE
).catch(
  err => process.stderr.write(
    `ERROR: ${err.message}\n${err.stack}\n`
  )
).then(
  () => process.stderr.write('All Done!\n')
)

