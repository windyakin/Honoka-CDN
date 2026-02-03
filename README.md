# Honoka CDN

[Honoka - 日本語も美しく表示できるBootstrapテーマ](http://honokak.osaka/) のCDNを管理するリポジトリ。

## Work it!

[cdn.honokak.osaka](https://cdn.honokak.osaka/)

## ホスティング

Cloudflare R2 でファイルをホスティングしています。

各テーマの配布ファイル (CSS / JS / フォント) は Git submodule として `content/` 配下に配置されており、`upload-to-r2.mjs` スクリプトで R2 バケットにアップロードします。

### URL 形式

```
https://cdn.honokak.osaka/{theme}/{version}/{css|js|fonts}/{filename}
```

例: `https://cdn.honokak.osaka/honoka/4.3.1/css/bootstrap.min.css`

### 対象テーマ

- **Honoka** (`honoka/`) - https://github.com/windyakin/Honoka
- **Umi** (`umi/`) - https://github.com/NKMR6194/Umi
- **Nico** (`nico/`) - https://github.com/kubosho/Nico
- **Rin** (`rin/`) - https://github.com/raryosu/Rin

## R2 へのアップロード

### 前提

- Node.js
- Cloudflare R2 の S3 互換 API トークン (R2 ダッシュボードの「Manage R2 API Tokens」から発行)

### 手順

```bash
# 依存パッケージのインストール
npm install

# アップロード対象の確認 (dry run)
DRY_RUN=true node upload-to-r2.mjs

# R2 へアップロード
R2_ACCOUNT_ID=<account-id> \
R2_ACCESS_KEY_ID=<access-key-id> \
R2_SECRET_ACCESS_KEY=<secret-access-key> \
R2_BUCKET_NAME=<bucket-name> \
node upload-to-r2.mjs
```

## LICENSE

MIT LICENSE

## Author

windyakin ([@MITLicense](https://twitter.com/MITLicense))
