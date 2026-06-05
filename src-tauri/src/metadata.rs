use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use exif::{Tag, Reader};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ExifTag {
    pub tag: String,
    pub description: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MetadataResult {
    pub file_name: String,
    pub file_size_bytes: u64,
    pub mime_type: String,
    pub exif_tags: Vec<ExifTag>,
}

fn get_tag_description(tag: Tag) -> String {
    match tag {
        Tag::Make => "Camera Manufacturer".to_string(),
        Tag::Model => "Camera Model".to_string(),
        Tag::DateTime => "Date Modified".to_string(),
        Tag::DateTimeOriginal => "Date Taken".to_string(),
        Tag::DateTimeDigitized => "Date Digitized".to_string(),
        Tag::GPSLatitude => "Latitude".to_string(),
        Tag::GPSLongitude => "Longitude".to_string(),
        Tag::GPSAltitude => "Altitude".to_string(),
        Tag::Software => "Software Used".to_string(),
        Tag::ImageWidth => "Image Width".to_string(),
        Tag::ImageLength => "Image Height".to_string(),
        Tag::ExposureTime => "Exposure Time".to_string(),
        Tag::FNumber => "Aperture".to_string(),
        Tag::ISOSpeed => "ISO Speed".to_string(),
        Tag::FocalLength => "Focal Length".to_string(),
        Tag::UserComment => "User Comment".to_string(),
        Tag::Orientation => "Orientation".to_string(),
        _ => {
            let s = tag.to_string();
            let mut result = String::new();
            for (i, c) in s.char_indices() {
                if i > 0 && c.is_uppercase() {
                    result.push(' ');
                }
                result.push(c);
            }
            result
        }
    }
}

pub fn read_metadata_from_file(path_str: &str) -> Result<MetadataResult, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File does not exist: {}", path_str));
    }

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let file_metadata = std::fs::metadata(path)
        .map_err(|e| format!("Failed to read file system metadata: {}", e))?;
    
    let file_size_bytes = file_metadata.len();

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let mime_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "tif" | "tiff" => "image/tiff",
        _ => "image/unknown",
    };

    let mut exif_tags = Vec::new();

    // Read EXIF metadata
    if let Ok(file) = File::open(path) {
        let mut buf_reader = BufReader::new(file);
        let exif_reader = Reader::new();
        // If exif read fails, we still return the other file metadata (name, size, type) with empty tags
        if let Ok(exif) = exif_reader.read_from_container(&mut buf_reader) {
            for field in exif.fields() {
                let tag_name = field.tag.to_string();
                let tag_value = field.display_value().with_unit(&exif).to_string();
                
                // Skip empty or trivial tags
                if tag_name.trim().is_empty() || tag_value.trim().is_empty() {
                    continue;
                }

                let description = get_tag_description(field.tag);
                
                exif_tags.push(ExifTag {
                    tag: tag_name,
                    description,
                    value: tag_value,
                });
            }
        }
    }

    Ok(MetadataResult {
        file_name,
        file_size_bytes,
        mime_type: mime_type.to_string(),
        exif_tags,
    })
}

pub fn strip_metadata_from_file(input_path: &str, output_path: &str) -> Result<(), String> {
    let input_bytes = std::fs::read(input_path)
        .map_err(|e| format!("Failed to read input file: {}", e))?;
    
    let clean_bytes = metastrip::strip_metadata(&input_bytes)
        .map_err(|e| format!("Failed to strip metadata: {}", e))?;
        
    std::fs::write(output_path, clean_bytes)
        .map_err(|e| format!("Failed to write clean file: {}", e))?;
        
    Ok(())
}
