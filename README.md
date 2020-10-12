# VideoVad - Accomplish streaming video with VAD segmentation

VideoVad utility applying Mozilla VAD (Voice Activation and Detection) engine to transcode video from local file or Youtube URL to HLS ready package segmented with respect to voice fragments location. 

## Getting started

Let's suppose your local data folder is named `/local/folder/data` 

Also lets suppose this folder contains `input.txt` file with list of youtube URL's or local file paths.


There are two ways to run VideoVad:

### Dockerless flow

```
$ npm install .
$ npm start /local/folder/data/input.txt /local/folder/data/output
```

### Docker flow
```
$ npm run docker:build
$ npm run docker:start -v /local/folder/data:/home/node/data
```

(All paths in `input.txt` will be resolved according to docker file system that will not contain yout host files any magic way)

## License note

[MIT License](LICENSE)

Copyright (c) 2020 [Kutukov Ilya](mailto:post.ilya@gmail.com)
