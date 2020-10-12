## Apple - HLS Authoring Specification for Apple Devices

Source: [HLS Authoring Specification for Apple Devices](https://developer.apple.com/documentation/http_live_streaming/hls_authoring_specification_for_apple_devices)

### General Authoring Requirements - Video

1. Video encoding requirements

1.1. All video MUST be encoded using H.264/AVC or HEVC/H.265.

1.2. The container format for H.264 video MUST be fragmented MP4 (fMP4) files or MPEG transport streams.

1.3.

1.3a. For maximum compatibility, some H.264 variants SHOULD be less than or equal to High Profile, Level 4.1.

1.3b. * Profile and Level for H.264 MUST be less than or equal to High Profile, Level 5.2.

1.4. For H.264, you SHOULD use High Profile in preference to Main or Baseline Profile.

1.5. The container format for HEVC video MUST be fMP4.

1.6.

1.6a. For maximum compatibility, some HEVC variants SHOULD be less than or equal to Main 10 Profile, Level 4.0, Main Tier.

1.6b. Profile, Level, and Tier for HEVC MUST be less than or equal to Main 10 Profile, Level 5.1, High Tier.

1.7. High Dynamic Range (HDR) HEVC video MUST be HDR10, HLG, or DolbyVision.

1.8. For HDR10 video, the SEI NAL units (that is, static metadata) SHOULD be in the HEVC Configuration Box ('hvcC') and not in the individual sample data.

1.9. Profile and Level for Dolby Vision MUST be Profile 5 (single layer 10-bit HEVC) and less than or equal to Level 7.

1.10. You SHOULD use video formats in which the parameter sets are stored in the sample descriptions, rather than the samples. (that is, use 'avc1', 'hvc1', or 'dvh1' rather than 'avc3', 'hev1', or 'dvhe'.)

1.11. For backward compatibility, content SHOULD NOT use a higher level than required by the content resolution and frame rate.

1.12. For backward compatibility, some video content SHOULD be encoded with H.264.

1.13. Key frames (IDRs) SHOULD be present every two seconds.

1.14. All interlaced source content MUST be deinterlaced.

1.15. You SHOULD deinterlace 30i content to 60p instead of 30p.

1.16. Live/Linear video from NTSC or ATSC source SHOULD be 60 or 59.94 fps.

1.17. Live/Linear video from PAL source SHOULD be 50 fps.

1.18. VOD content SHOULD use a natural frame rate for the content. Any of the following frame rates: 23.976, 24, 25, 29.97, 30, 50, 59.94, and 60 fps are supported.

1.19. Frame rates above 60 fps SHALL NOT be used.

1.20. * For HDR content, frame rates less than or equal to 30 fps SHOULD be provided.

1.21. Streams SHOULD use a single color space—one of either Rec. 601, Rec. 709, DCI-P3, or Rec. 2020.

1.22. For VOD, the color space SHOULD be the original color space of the material.

1.23. * If multiple video streams are provided (H.264, HEVC, HDR), each stream SHOULD provide all anticipated bandwidths. Clients SHOULD NOT be required to switch codecs.

1.24. For backward compatibility, SDR streams MUST be provided. (See also item 6.16.)

1.25. * There are many possible choices of bit rates for variants. The following tables provide one possible set of bit rate variants. (See On Bit Rates for Variants for additional considerations.)

Table 2 Video average bit rate (kbit/s)
16:9 aspect ratio

H.264/AVC

Frame rate

416 x 234

145

≤ 30 fps

640 x 360

365

≤ 30 fps

768 x 432

730

≤ 30 fps

768 x 432

1100

≤ 30 fps

960 x 540

2000

same as source

1280 x 720

3000

same as source

1280 x 720

4500

same as source

1920 x 1080

6000

same as source

1920 x 1080

7800

same as source

Table 3 Video average bit rate (kbit/s)
16:9 aspect ratio

HEVC/H.265 30 fps

HDR (HEVC) 30 fps

Frame rate

640 x 360

145

160

≤ 30 fps

768 x 432

300

360

≤ 30 fps

960 x 540

600

730

≤ 30 fps

960 x 540

900

1090

≤ 30 fps

960 x 540

1600

1930

same as source

1280 x 720

2400

2900

same as source

1280 x 720

3400

4080

same as source

1920 x 1080

4500

5400

same as source

1920 x 1080

5800

7000

same as source

2560 x 1440

8100

9700

same as source

3840 x 2160

11600

13900

same as source

3840 x 2160

16800

20000

same as source

Note

The above bit rates are initial encoding targets for typical content delivered via HLS. Apple recommends that you evaluate them against your specific content and encoding workflow, then adjust accordingly.

30i source content is considered to have a source frame rate of 60 fps. 24 fps HEVC content should use bit rates reduced by about 20% from the values above.

1.26. For VOD content, the average segment bit rate MUST be within 10% of the AVERAGE-BANDWIDTH attribute. (See Declared Versus Measured Values of Bandwidths.)

1.27. For VOD content, the measured peak bit rate MUST be within 10% of the BANDWIDTH attribute.

1.28. For live/linear content, the average segment bit rate over a long (~1 hour) period of time MUST be less than 110% of the AVERAGE-BANDWIDTH attribute.

1.29. For live/linear content, the measured peak bit rate MUST be less than 125% of the BANDWIDTH attribute.

1.30. For VOD content, the peak bit rate SHOULD be no more than 200% of the average bit rate.

1.31. Different variants MAY have different frame rates.

1.32. * The default video variants SHOULD be the 2000 kbit/s (average bit rate) variant. (Defaults are the first variant listed in the Master Playlist within a group of variants having compatible audio.)

1.33. All video variants SHOULD have identical aspect ratios.



## Media segmentation requirements

7.1. Your media MUST be continuous across segments, with the exception of transitions for ads and other inserted material.

7.2. If using a transport stream, continuity counters and timestamps MUST be sequential.

7.3. If using fMP4, the track fragment decode time MUST be consistent with the decode time and duration of the previous segment.

7.4. Video segments MUST start with an IDR frame.

7.5. Target durations SHOULD be 6 seconds.

7.6. Segment durations SHOULD be nominally 6 seconds (for example, NTSC 29.97 may be 6.006 seconds).

7.7. Media Segments MUST NOT exceed the target duration by more than 0.5 seconds.

7.8. Each xHE-AAC segment SHOULD start with an Immediate Playout Frame (IPF).
