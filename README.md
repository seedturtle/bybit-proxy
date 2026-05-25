# Bybit Proxy 🌐

在 Zeabur 或其他非美國伺服器上運行的 Bybit API proxy，解決 Bybit 封鎖美國 IP 的問題。

## 快速部署到 Zeabur

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/69bd997cacf71816f25b93c4?repository=https://github.com/seedturtle/bybit-proxy)

或手動：
1. 登入 [Zeabur Dashboard](https://zeabur.com)
2. 建立新專案 → 連結此 GitHub repo
3. 無需任何設定，自動部署

## API 使用

部署後會得到一個網址如 `https://bybit-proxy.zeabur.app`

```
# 替代 Bybit API 呼叫
# 原本：curl https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT
# 改為：
curl https://你的網址.zeabur.app/bybit/v5/market/tickers?category=spot&symbol=BTCUSDT
```

### 支援的端點
所有 `/bybit/*` 路徑會自動轉發到 `https://api.bybit.com/*`

### 健康檢查
```
curl https://你的網址.zeabur.app/health
```
