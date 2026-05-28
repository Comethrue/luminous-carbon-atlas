# 免费部署指南 — GitHub Pages + Render

## 前提

- 电脑上有 Git（`git --version` 确认）
- 有一个 GitHub 账号（没有就去 github.com 注册）

---

## 第一步：在 GitHub 创建仓库

1. 浏览器打开 https://github.com → 登录
2. 点击右上角 **+** → **New repository**
3. Repository name 填：`luminous-carbon-atlas`
4. 选择 **Public**
5. **不要**勾选 Add a README
6. 点击 **Create repository**
7. 看到 `git remote add origin ...` 那行命令，**复制下来备用**

---

## 第二步：推送代码到 GitHub

打开终端（PowerShell），逐行执行：

```bash
# 进入项目目录
cd c:/Users/a/Desktop/PCB/luminous-carbon-atlas

# 确认文件都在
ls
# 应该看到: backend/ frontend/ shared/ scripts/ .github/ .gitignore

# 提交所有代码
git add -A
git commit -m "initial deploy"

# 连接 GitHub（把下面这行替换成你刚才复制的）
git remote add origin https://github.com/你的用户名/luminous-carbon-atlas.git

# 推送
git push -u origin main
```

弹窗让你登录 GitHub → 登录 → 等推送完成。

---

## 第三步：开启 GitHub Pages（部署前端）

1. 浏览器打开你的仓库页面：`https://github.com/你的用户名/luminous-carbon-atlas`
2. 点击顶部 **Settings** 标签
3. 左侧菜单点击 **Pages**
4. **Build and deployment** → **Source** 下拉选择 **GitHub Actions**
5. 页面自动刷新，你会看到一个 workflow 开始运行
6. 等 1-2 分钟，黄色圆点变成绿色 ✓
7. 回到 **Settings → Pages**，顶部会显示：

```
Your site is live at https://你的用户名.github.io/luminous-carbon-atlas/
```

**点这个链接 → 你的前端就上线了。** 所有图表、地图、数据完整运行，无需后端。

---

## 第四步：在 Render 部署后端（获取真实天气数据）

1. 浏览器打开 https://render.com
2. 点击 **Get Started** → 用 GitHub 账号登录并授权
3. 点击右上角 **New +** → **Web Service**
4. 点击 **Connect account** 连接 GitHub → 选择 `luminous-carbon-atlas` 仓库 → **Connect**
5. 填写配置：

| 字段 | 填写内容 |
|------|----------|
| **Name** | `luminous-api` |
| **Region** | Singapore（亚洲最快） |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port 10000` |
| **Instance Type** | **Free**（最底部） |

6. 点击 **Deploy Web Service**
7. 等 3-5 分钟，状态变 **Live** → 记下链接：`https://luminous-api.onrender.com`

**验证后端**：浏览器打开 `https://luminous-api.onrender.com/api/environment` → 看到 JSON 数据即成功。

---

## 第五步（可选）：前端连接后端

当前前端用 mock 数据运行。如果想接入真实后端数据：

编辑 `.github/workflows/deploy-frontend.yml`，找到这一行：

```yaml
VITE_BASE=/luminous-carbon-atlas/ npm run build
```

改成：

```yaml
VITE_BASE=/luminous-carbon-atlas/ VITE_API_BASE=https://luminous-api.onrender.com npm run build
```

然后提交推送：

```bash
git add .github/workflows/deploy-frontend.yml
git commit -m "connect to backend"
git push
```

GitHub Pages 自动重新部署，1 分钟后前端就连接真实天气数据了。

---

## 完成状态

| 服务 | 地址 | 费用 |
|------|------|------|
| 前端 | `https://你的用户名.github.io/luminous-carbon-atlas/` | $0 |
| 后端 | `https://luminous-api.onrender.com` | $0（750h/月） |

> Render 免费版 15 分钟无访问自动休眠，下次访问需等 30 秒唤醒。前端 mock 数据在休眠期间不受影响，仍可正常运行。
