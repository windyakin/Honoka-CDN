# CLAUDE.md

## プロジェクト概要

Honoka をはじめとする Bootstrap テーマの CDN (`cdn.honokak.osaka`) を構成するリポジトリ。ファイルは Cloudflare R2 でホスティングしている。

## リポジトリ構成

- `content/` - 配信対象ファイル。各テーマのバージョンは Git submodule で管理
  - `content/{honoka,umi,nico,rin}/{version}/dist/{css,js,fonts}/` - 実際の配布ファイル
  - `content/index.html` - ランディングページ
- `upload-to-r2.mjs` - R2 アップロードスクリプト (Node.js, ES Module)
- `package.json` - `@aws-sdk/client-s3` への依存
- `nginx/` - 旧構成 (Docker/nginx) の設定ファイル。現在は使用していない
- `Dockerfile`, `docker-compose.yml` - 旧構成。現在は使用していない

## R2 アップロードスクリプト

`upload-to-r2.mjs` は `content/` 配下の submodule から `dist/{css,js,fonts}/` のファイルを収集し、Cloudflare R2 にアップロードする。

### R2 キーの規則

ローカルパス `content/{theme}/{version}/dist/{type}/{file}` → R2 キー `{theme}/{version}/{type}/{file}` (`dist/` を除去)

### 環境変数

- `R2_ACCOUNT_ID` - Cloudflare アカウント ID
- `R2_ACCESS_KEY_ID` - R2 S3 互換 API のアクセスキー
- `R2_SECRET_ACCESS_KEY` - R2 S3 互換 API のシークレットキー
- `R2_BUCKET_NAME` - アップロード先バケット名
- `DRY_RUN=true` - アップロードせずに対象ファイル一覧を表示

### 実行方法

```bash
npm install
DRY_RUN=true node upload-to-r2.mjs   # 確認
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=... node upload-to-r2.mjs
```

## Cloudflare 側の設定

- R2 バケットにカスタムドメインを接続
- Transform Rules: 末尾 `/` のリクエストに `index.html` を付与 (`concat(http.request.uri.path, "index.html")`)
- R2 バケットの CORS 設定: `Access-Control-Allow-Origin: *` (フォントのクロスオリジン読み込み用)
- Cache Rules: `index.html` はデフォルトではキャッシュされないため、必要に応じて Cache Rules で対応
