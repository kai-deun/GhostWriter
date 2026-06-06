export function isReadOnlyTag(tag: string): boolean {
  // ExifTool cannot reliably edit or delete these core/technical tags without breaking the file.
  const lowerTag = tag.toLowerCase();

  // Match custom proprietary Android/Xiaomi tags which cannot be individually written
  if (lowerTag.startsWith('com') || lowerTag.startsWith('xiaomi')) {
    return true;
  }

  const readOnlyKeywords = [
    'duration', 'bitrate', 'timescale', 'resolution',
    'filesize', 'mediadatasize', 'mediadataoffset', 'imagesize',
    'trackduration', 'mediaduration', 'trackid', 'nexttrackid',
    'mediaheaderversion', 'movieheaderversion', 'trackheaderversion',
    'compressorid', 'compressorname', 'handlerdescription', 'handlertype',
    'handlervendorid', 'majorbrand', 'minorversion', 'compatiblebrands',
    'graphicsmode', 'opcolor', 'bitdepth', 'pixelaspectratio',
    'buffersize', 'maxbitrate', 'averagebitrate', 'avgbitrate',
    'megapixels', 'videoframerate', 'rotation', 'samplerate', 'channels',
    'audiobitrate', 'currenttime', 'postertime', 'previewtime',
    'previewduration', 'selectiontime', 'selectionduration',
    'preferredrate', 'preferredvolume', 'tracklayer', 'trackvolume',
    'medialanguagecode', 'sourceimagewidth', 'sourceimageheight',
    'imagewidth', 'imageheight', 'xresolution', 'yresolution',
    'colorcomponents', 'ycbcrsubsampling', 'encodingprocess', 'bitspersample'
  ];
  
  return readOnlyKeywords.includes(lowerTag);
}
