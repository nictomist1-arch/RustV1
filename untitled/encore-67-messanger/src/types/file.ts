import { convertFileSrc } from "@tauri-apps/api/core";

export function getFileUrl(
    path:string
){
    if (
        path.startsWith("http://")
        || path.startsWith("https://")
        || path.startsWith("data:")
    ) {
        return path;
    }

    return convertFileSrc(
        path
    );
}
