// 检测是否为二进制文件
export function isBinaryFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || ''

  const binaryExtensions = [
    // 文档格式
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
    // 可执行文件
    'exe', 'dll', 'so', 'dylib', 'app', 'deb', 'rpm',
    // 压缩文件
    'zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz',
    // 图片
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'tiff', 'tif', 'svg',
    // 音视频
    'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac', 'ogg', 'wmv', 'mkv', 'webm', 'aac', 'm4a', 'aiff', 'wma',
    // 数据库
    'db', 'sqlite', 'sqlite3',
    // 其他二进制
    'bin', 'dat', 'iso', 'dmg', 'pkg',
  ]

  return binaryExtensions.includes(ext)
}

// 检测是否为音频文件
export function isAudioFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'webm', 'aiff', 'wma']
  return audioExtensions.includes(ext)
}

// 检测是否为压缩文件
export function isArchiveFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const archiveExtensions = ['zip', 'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'rar', '7z', 'xz']
  return archiveExtensions.includes(ext) || path.toLowerCase().endsWith('.tar.gz') || path.toLowerCase().endsWith('.tar.bz2')
}

// 获取文件类型描述
export function getFileTypeDescription(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''

  const typeMap: Record<string, string> = {
    pdf: 'PDF Document',
    doc: 'Word Document',
    docx: 'Word Document',
    xls: 'Excel Spreadsheet',
    xlsx: 'Excel Spreadsheet',
    ppt: 'PowerPoint Presentation',
    pptx: 'PowerPoint Presentation',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    gif: 'GIF Image',
    zip: 'ZIP Archive',
    tar: 'TAR Archive',
    gz: 'GZIP Archive',
    rar: 'RAR Archive',
    exe: 'Executable',
    mp3: 'MP3 Audio',
    wav: 'WAV Audio',
    ogg: 'OGG Audio',
    flac: 'FLAC Audio',
    mp4: 'MP4 Video',
    avi: 'AVI Video',
  }

  return typeMap[ext] || 'Binary File'
}