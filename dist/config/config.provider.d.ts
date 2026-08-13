import { ConfigProvider } from 'tabby-core';
/**
 * Provide configuration settings for the SFTP-XP plugin.
 * @hidden
 */
export declare class SftpXpConfigProvider extends ConfigProvider {
    defaults: {
        sftpXp: {
            theme: string;
            iconStyle: string;
            defaultDownloadFolder: string;
            tempFolder: string;
            maxCacheSizeMB: number;
            openFileSizeLimitMB: number;
            showHiddenFiles: boolean;
            editor: {
                theme: string;
                minimap: boolean;
                fontFamily: string;
                fontSize: number;
                lineHeight: number;
                letterSpacing: number;
            };
        };
    };
}
