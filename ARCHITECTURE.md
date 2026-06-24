# 宠物寄养平台后端 — 架构说明

> 给刚接手项目的新人看的大白话手册。看完这篇你应该知道「哪块改啥、从哪下手」。

---

## 一、项目是干嘛的

一个宠物版 Airbnb：
- **主人端**：家里养宠物、要出差/旅游找寄养的用户 → 登记宠物档案、搜索附近寄养家庭、下单
- **寄养家庭端**：家里有空位愿意接宠物赚钱的用户 → 发布档期和报价、接单、每天写反馈
- **双方互评**：寄养结束后互相打分写评语

技术栈非常简单：
- **Node.js + Express** —— 轻量后端框架
- **SQLite (better-sqlite3)** —— 单文件数据库，不用装 MySQL，跑起来就用
- **JWT** —— 登录鉴权，token 放 `Authorization: Bearer xxx` 头里
- **Multer** —— 图片上传

---

## 二、三个核心业务模块

| 模块 | 对应的 API 前缀 | 谁会用 | 主要干点啥 |
|---|---|---|---|
| **用户与宠物档案** | `/api/users` `/api/pets` | 双方都用 | 注册登录、个人资料、宠物档案（品种/年龄/疫苗/照片） |
| **寄养家庭与档期** | `/api/foster-homes` `/api/schedules` | 寄养家庭主操作，主人搜索 | 寄养家庭资料（环境/院子照片/报价）、每天能接宠物的档期表 |
| **订单 / 反馈 / 评价** | `/api/orders` `/api/orders/:id/feedbacks` `/api/reviews` | 双方交互 | 下单 → 确认 → 激活 → 完成，期间每天提交寄养反馈，最后双方互评 |

---

## 三、代码分层：4 层，一层只干一层的事

所有业务代码都在 `src/` 下面，**绝对不跨层调用**，也不反向调用。

```
src/
├── app.js                    ← 入口，挂载所有路由
├── config/database.js        ← SQLite 连接、建表、注册 haversine_distance（算距离的自定义函数）
│
├── middleware/               ← 中间件（鉴权、上传、错误处理）
│   ├── auth.js               ← JWT 生成 + 校验 + 角色拦截(requireRole)
│   ├── upload.js             ← Multer 图片上传配置(10MB 限制，只允许图片格式)
│   └── errorHandler.js       ← 统一错误响应
│
├── utils/                    ← 公共工具（改一处全项目生效）
│   ├── validator.js          ← 断言式校验：assertExists / assertOwner / assertRange / assertIn 等
│   ├── sql.js                ← SQL 拼接：buildWhereClause / buildSetClause / appendOrderAndLimit
│   └── response.js           ← 响应格式：success() / paginate()
│
├── routes/                   ← 第①层：路由，只做 URL → controller 的映射
├── controllers/              ← 第②层：控制器，拆参数、调 service、包响应
├── services/                 ← 第③层：业务逻辑，判断校验、状态流转、事务处理
└── repositories/             ← 第④层：数据访问，只写 SQL，不写业务判断
```

### 数据怎么一层层传的（以主人下单为例）

1. **浏览器** `POST /api/orders`，请求头带 token，body 里有 `{ foster_home_id, pet_id, start_date, end_date }`
2. **authMiddleware**：验证 token → 从 token 里解出 `req.user = { id, role }`
3. **orderRoutes**：匹配到 `router.post('/', authMiddleware, requireRole('owner'), orderCtrl.createOrder)`
4. **orderController.createOrder**：从 `req.user.id` 取 `ownerId`，从 `req.body` 拆参数，调用 `orderService.createOrder(ownerId, req.body)`，然后把返回值用 `success()` 包一下 `res.json`
5. **orderService.createOrder**：这里写真正的业务判断——
   - 主人是否有这只宠物？(用 `assertOwner`)
   - 寄养家庭的档期有没有冲突？(查 scheduleRepo)
   - 算出 `total_price`，生成唯一的 `order_no`
   - 调用 `orderRepo.create(...)` 落库
6. **orderRepo.create**：纯 SQL，`INSERT INTO orders ... @xxx`，返新增行

> **关键定位口诀**：接口报错找不到位置？
> - 401/403 → 先看 `middleware/auth.js`
> - 响应格式不对 → 找对应 `xxxController`
> - 业务判断逻辑/校验报错 → 找对应 `xxxService`
> - SQL 写错/查不到数据 → 找对应 `xxxRepo`

---

## 四、数据库表关系（7 张表）

一张图看懂：

```
users(用户表)
  ├─1:1 foster_homes(寄养家庭)    → 一个用户如果是 foster 角色，只能开 1 家寄养家庭
  └─1:N pets(宠物档案)           → 一个主人可以有 N 只宠物

foster_homes
  └─1:N schedules(档期表)        → 每个寄养家庭 N 天档期，每天一条(is_available + daily_price)

orders(订单表) ← 核心中枢
  ├─N:1 users(owner_id)         → 下单人
  ├─N:1 foster_homes            → 寄养到哪家
  ├─N:1 pets                    → 寄养哪只宠物
  ├─1:N daily_feedbacks         → 寄养期间每天一条反馈(文字+照片)
  └─1:N reviews                 → 订单完成后双方各 1 条评价

reviews(评价表)
  └─ review_type 区分: 'to_foster_home' (主人→寄养家庭) / 'to_pet' (寄养→宠物)
```

### 订单状态流转（非常重要，改流程先看这个）

```
pending(待确认) → confirmed(已确认) → active(寄养中) → completed(已完成)
           ↓            ↓            ↓
       cancelled    cancelled    ——不可取消
```

| 状态 | 谁触发 | 触发方式 |
|---|---|---|
| pending → confirmed | 寄养家庭 | `PUT /api/orders/:id/confirm` |
| pending → cancelled | 双方都行 | `PUT /api/orders/:id/cancel` |
| confirmed → active | 寄养家庭(宠物已入住) | `PUT /api/orders/:id/activate` |
| active → completed | 寄养家庭(寄养结束) | `PUT /api/orders/:id/complete` |

`completed` 之后双方才能互相评价，**一个订单同一种评价类型只能发一次**（UNIQUE 约束 `order_id + review_type + reviewer_id`）。

---

## 五、最常见的两种改动从哪下手

### 场景 1：加一个「给宠物/寄养家庭点赞收藏」的新功能
**顺序：从下往上加**
1. `database.js` 里加一张 `favorites(user_id, target_type, target_id, UNIQUE(xxx))`
2. 新建 `src/repositories/favoriteRepo.js`：create / remove / findByUserId
3. 新建 `src/services/favoriteService.js`：判断目标是否存在、不能自己收藏自己这种逻辑写这里
4. 新建 `src/controllers/favoriteController.js`：取 req.user 调 service
5. 新建 `src/routes/favoriteRoutes.js`，**然后别忘了在 `src/app.js` 里 `app.use('/api/favorites', favoriteRoutes)`**

### 场景 2：改某个接口的返回字段，比如「寄养家庭详情要把最近的 5 条好评带上」
1. 找路由：`GET /api/foster-homes/:id` → `fosterHomeController.getFosterHome`
2. controller 里调用了 `fosterHomeService.getFosterHomeById` → 去 service 看
3. service 调了 `fosterHomeRepo.findById` → 可以在 repo 里新加一个 `findByIdWithTopReviews(id)`，或者 service 里多调一次 `reviewRepo.findByTargetId`，哪个方便用哪个

---

## 六、完整接口列表 + curl 示例

> 说明：示例中 `$OWNER_TOKEN`、`$FOSTER_TOKEN` 是登录后返回的 JWT，要自己替换。查询用 GET，修改用 POST/PUT/DELETE。所有响应统一格式：
> ```json
> { "code": 0, "message": "success", "data": {...} }
> ```
> 列表接口返回 `{ code, message, data: { list, total, page, pageSize } }`

---

### ① 用户模块 `/api/users`

```bash
# 注册
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800001111","password":"abc12345","nickname":"张主人","role":"owner","latitude":39.9042,"longitude":116.4074}'
# role: owner(主人) / foster(寄养) / both(两者都)

# 登录（返回 data.token）
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800001111","password":"abc12345"}'

# 查自己的资料
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 改资料
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"新名字","address":"新地址"}'

# 找附近的用户(附近寄养家庭用下面的 /foster-homes/search，这个是找用户自己)
curl "http://localhost:3000/api/users/nearby?latitude=39.9042&longitude=116.4074&radius=20" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

---

### ② 宠物档案 `/api/pets`

```bash
# 创建宠物档案（支持 multipart 传照片，字段名 photos，最多 9 张）
curl -X POST http://localhost:3000/api/pets \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"旺财","breed":"金毛","age":3,"gender":"male","weight":25.5,"vaccination_records":[{"name":"狂犬","date":"2025-01-01"}],"personality_notes":"温顺，爱掉毛","photo_urls":["/uploads/xxx.jpg"]}'

# 我家的宠物列表
curl http://localhost:3000/api/pets/my \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 看某只宠物详情
curl http://localhost:3000/api/pets/1

# 修改宠物
curl -X PUT http://localhost:3000/api/pets/1 \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"age":4}'

# 删除宠物（只能自己删）
curl -X DELETE http://localhost:3000/api/pets/1 \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

---

### ③ 寄养家庭 `/api/foster-homes`

```bash
# 寄养家庭创建资料（需要 foster 或 both 角色）
# 如果传照片：用 multipart/form-data，字段 photos，传个 photo_type=yard 表示是院子照片，否则当环境照片
curl -X POST http://localhost:3000/api/foster-homes \
  -H "Authorization: Bearer $FOSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"温馨小院","description":"有院子","daily_price":150,"max_pets":3,"pet_type_accepted":"all","latitude":39.9142,"longitude":116.4174,"address":"朝阳区XX路","environment_photo_urls":[],"yard_photo_urls":[],"amenities":["有围栏","定时喂饭"]}'

# 我自己的寄养家庭详情
curl http://localhost:3000/api/foster-homes/my \
  -H "Authorization: Bearer $FOSTER_TOKEN"

# 看某个寄养家庭详情
curl http://localhost:3000/api/foster-homes/1

# 根据位置搜索附近的寄养家庭
# petType 可选，不传或=all 返回全部
curl "http://localhost:3000/api/foster-homes/search?latitude=39.9042&longitude=116.4074&radius=20&page=1&pageSize=10&petType=dog"

# 更新我的寄养家庭
curl -X PUT http://localhost:3000/api/foster-homes \
  -H "Authorization: Bearer $FOSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daily_price":180}'
```

---

### ④ 档期管理（挂在 foster-homes 下）

```bash
# 给某一天单独加档期
curl -X POST http://localhost:3000/api/foster-homes/1/schedules \
  -H "Authorization: Bearer $FOSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-07-01","is_available":true,"daily_price":150,"note":"节假日加价"}'

# 批量建档期（最常用）
curl -X POST http://localhost:3000/api/foster-homes/1/schedules/batch \
  -H "Authorization: Bearer $FOSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schedules":[{"date":"2025-07-01","is_available":true,"daily_price":150},{"date":"2025-07-02","is_available":true,"daily_price":150},{"date":"2025-07-03","is_available":false}]}'

# 查看某寄养家庭的全部档期
curl http://localhost:3000/api/foster-homes/1/schedules

# 按日期范围查（搜索页最常用）
curl "http://localhost:3000/api/foster-homes/1/schedules/range?startDate=2025-07-01&endDate=2025-07-10"

# 改某一天档期
curl -X PUT http://localhost:3000/api/schedules/1 \
  -H "Authorization: Bearer $FOSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_available":false}'

# 删某一天档期
curl -X DELETE http://localhost:3000/api/schedules/1 \
  -H "Authorization: Bearer $FOSTER_TOKEN"
```

---

### ⑤ 订单 `/api/orders`

```bash
# 主人下单（必须 owner 角色，内部会校验所选日期是否都有可用档期，且档期没被其他订单占）
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"foster_home_id":1,"pet_id":1,"start_date":"2025-07-01","end_date":"2025-07-03","owner_note":"有点挑食，多给水"}'

# 我的订单（主人视角）
curl "http://localhost:3000/api/orders/my?status=pending&page=1&pageSize=10" \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 我收到的订单（寄养家庭视角，必须 foster 角色）
curl "http://localhost:3000/api/orders/received?status=confirmed&page=1&pageSize=10" \
  -H "Authorization: Bearer $FOSTER_TOKEN"

# 订单详情（双方都能看自己相关的）
curl http://localhost:3000/api/orders/1 \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 寄养家庭确认接单
curl -X PUT http://localhost:3000/api/orders/1/confirm \
  -H "Authorization: Bearer $FOSTER_TOKEN"

# 取消订单（pending/confirmed 状态下可以）
curl -X PUT http://localhost:3000/api/orders/1/cancel \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 宠物已入住，激活订单（寄养家庭操作，订单状态变 active）
curl -X PUT http://localhost:3000/api/orders/1/activate \
  -H "Authorization: Bearer $FOSTER_TOKEN"

# 寄养结束，标记完成（完成后才能互相评价）
curl -X PUT http://localhost:3000/api/orders/1/complete \
  -H "Authorization: Bearer $FOSTER_TOKEN"
```

---

### ⑥ 每日反馈（挂在订单下）`/api/orders/:orderId/feedbacks`

```bash
# 寄养家庭提交当日反馈（必须 foster 角色，photo_urls 至少 1 张）
# 传照片用 multipart/form-data，字段 photos
curl -X POST http://localhost:3000/api/orders/1/feedbacks \
  -H "Authorization: Bearer $FOSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-07-01","content":"今天吃了两顿饭，拉了一次便便，玩得特别开心！","photo_urls":["/uploads/a.jpg","/uploads/b.jpg"]}'

# 查看这个订单的所有反馈
curl http://localhost:3000/api/orders/1/feedbacks \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 看单条反馈详情
curl http://localhost:3000/api/orders/1/feedbacks/1 \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 修改当日反馈（只能寄养家庭改）
curl -X PUT http://localhost:3000/api/orders/1/feedbacks/1 \
  -H "Authorization: Bearer $FOSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"补充：晚上有点想家"}'
```

---

### ⑦ 评价 `/api/reviews`

```bash
# 提交评价（必须订单完成后才行）
# review_type:
#   'to_foster_home' → 主人给寄养家庭打分，target_id 自动取订单的 foster_home_id
#   'to_pet'         → 寄养家庭给宠物打分，target_id 自动取订单的 pet_id
# rating: 1-5 整数
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id":1,"review_type":"to_foster_home","rating":5,"content":"服务非常好，每天都有反馈很放心"}'

# 一个订单下的所有评价
curl http://localhost:3000/api/reviews/order/1 \
  -H "Authorization: Bearer $OWNER_TOKEN"

# 某个寄养家庭的全部评价（分页）
curl "http://localhost:3000/api/reviews/foster-home/1?page=1&pageSize=20"

# 某个寄养家庭的平均分和评价数
# 无评价时返回 avg_rating: null（不是 0），前端可据此显示「暂无评分」
curl http://localhost:3000/api/reviews/foster-home/1/rating

# 某只宠物的全部评价（分页）
curl "http://localhost:3000/api/reviews/pet/1?page=1&pageSize=20"

# 单条评价详情
curl http://localhost:3000/api/reviews/1
```

---

## 七、本地跑起来怎么操作

```bash
# 1. 安装依赖
npm install

# 2. 启动（首次启动会自动在 data/pet_foster.db 创建数据库）
npm start
# 或者
node src/app.js

# 3. 默认端口 3000，直接用上面的 curl 示例就能调
```

### 依赖清单（知道都是干嘛的就行，不用改）

| 包名 | 用途 |
|---|---|
| `express` | 框架 |
| `better-sqlite3` | 同步式 SQLite，写起来比回调舒服 |
| `bcryptjs` | 密码哈希（存的是 hash，不是明文） |
| `jsonwebtoken` | JWT 登录 |
| `multer` | 图片上传，存到 `/uploads` 目录 |

---

## 八、小 Tips

1. **加新的参数校验？** 去 `src/utils/validator.js` 里加新的 assert 函数，然后 service 里直接一行调，别写 3 行 if-throw。
2. **加新的条件查询 SQL？** 用 `buildWhereClause([条件数组])` 拼 WHERE，别自己字符串拼接容易漏。
3. **角色判断写在哪？** 路由层用 `requireRole('owner')` 快速拦截，细粒度的判断（比如是不是这个订单的 owner）写 service 用 `assertOwner()`。
4. **附近搜索是怎么实现的？** `database.js` 里注册了一个自定义 SQL 函数 `haversine_distance`，用经纬度计算公里距离，子查询先算再外层 WHERE 过滤距离。
5. **订单确认时档期怎么锁？** `orderService` 里用了事务 + `SELECT ... FOR UPDATE` 思路，确认时把日期范围内的 `is_available` 同时改成 0，其他订单再下就查不到可用档期了，不会超卖。
