import {getMimeTypeFromUri} from '@libs/fileDownload/FileUtils';
import ReceiptStorage from '@libs/ReceiptStorage';

import type {ResolveReceiptFile} from './types';

const resolveReceiptFile: ResolveReceiptFile = (source, filename) => {
    const localUri = ReceiptStorage.resolve(source);
    if (!localUri) {
        return Promise.resolve(undefined);
    }

    return fetch(localUri)
        .then((response) => (response.ok ? response.blob() : undefined))
        .then((blob) => {
            if (!blob) {
                return undefined;
            }
            const type = blob.type || getMimeTypeFromUri(filename) || 'application/octet-stream';
            const file = new File([blob], filename, {type});
            return Object.assign(file, {uri: localUri, source: localUri});
        })
        .catch(() => undefined);
};

export default resolveReceiptFile;
