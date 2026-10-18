---
title: 2023 华为软件精英挑战赛复盘
published: 2023-05-05
description: '选手程序操控 4 个机器人执行前进、后退、旋转、购买、出售等动作来完成物品递送任务，同时赚取差价获得利润。在运行结束时，选手拥有的资金数即为最终分数，所获得的资金越高越好。'
image: 'https://res.cloudinary.com/rhc7o5mz/image/upload/blog/posts/huawei-code-craft-2023/cover.avif'
tags: [华为, 软件, 算法, 比赛]
category: '比赛复盘'
slug: huawei-code-craft-2023
---

## 比赛简介

### 比赛主页
[2023 华为软件精英挑战赛——普朗克计划](https://competition.huaweicloud.com/codecraft2023)

### 比赛题目

初赛：选手程序操控 4 个机器人执行前进、后退、旋转、购买、出售等动作来完成物品递送任务，同时赚取差价获得利润。在运行结束时，选手拥有的资金数即为最终分数，所获得的资金越高越好。

复赛：引入复杂固定障碍。

决赛：引入激光雷达，两队对抗战。

彩蛋题：引入激光探图机制，不提供地图数据。

> 在这个彩蛋当中，没有对手，有的只是你不断的超越自己；也没有比赛奖励，有的只是你在攻克了一道道技术难题之后所收获的兴奋与成长。希望所有的参赛选手，能够喜欢赛题组精心准备的这份礼物。
> <p style="text-align: right;">——2023 软挑赛题组</p>

### 赛题资料

- [初赛练习赛](https://bbs.huaweicloud.com/forum/thread-0225113791152139025-1-1.html)
- [初赛正式赛](https://bbs.huaweicloud.com/forum/thread-0219115001097335002-1-1.html)
- [复赛练习赛](https://bbs.huaweicloud.com/forum/thread-0276115433925333002-1-1.html)
- [复赛正式赛](https://bbs.huaweicloud.com/forum/thread-0217116396999188032-1-1.html)
- [决赛练习赛](https://bbs.huaweicloud.com/forum/thread-0298116469469619076-1-1.html)
- [决赛正式赛](https://bbs.huaweicloud.com/forum/thread-0232117504867893010-1-1.html)
- [彩蛋题](https://bbs.huaweicloud.com/forum/thread-0232118049695936048-1-1.html)

> 彩蛋题资料中包含 SimpleDemo 源码，并且可以同时运行于初赛、复赛、决赛、彩蛋题。

## 初赛策略

初赛赛题需要考虑的情况不算复杂，所以使用的各项策略也十分简单，使用 Python 编程。

### 运动控制

因为机器人的运动并不是简单的线性运动，准确控制需要根据提供的机器人各项物理参数求解运动方程，并且给出的参数都是如电机最大扭矩之类的，而实际运动中电机扭矩是随运动幅度变化的，所以计算会比较复杂。为了避免复杂的运动控制计算（~~其实是不想做~~），我采用了最为简单的 PID 算法来控制机器人的旋转，实现后发现只要 P 的效果也足够用了（测试发现机器人运动摩擦力非常大，故振荡较小），所以最终实现起来非常简单，以下为核心代码。

```python
# 方向调整控制
expected_angle = calculate_angle(bot_id, table_id)  # 计算目标方向角
# 目标方向和当前方向之差大于pi时需要转换
if numpy.abs(expected_angle - bot['direction']) > numpy.pi:
    # 当前朝向先做转换变到与目标方向同号
    # 当前朝向方向角为0不需要转换
    # 转换结果只在临时变量中用于计算偏差角，并不修改数据字典中的值
    if bot['direction'] < 0:
        bot['direction'] += 2 * numpy.pi
    elif bot['direction'] > 0:
        bot['direction'] -= 2 * numpy.pi
# 控制旋转速度，偏差角度越大角速度越大
if expected_angle - bot['direction'] < 0:
    command['rotate'][bot_id] = -min_rotate_velocity + angular_velocity_kp * (expected_angle - bot['direction'])
elif expected_angle - bot['direction'] > 0:
    command['rotate'][bot_id] = min_rotate_velocity + angular_velocity_kp * (expected_angle - bot['direction'])
# 到达偏差角阈值以最大速度前进
if numpy.abs(expected_angle - bot['direction']) < start_move_angle_threshold:
    command['forward'][bot_id] = max_forward_velocity
# 否则以最小速度前进
else:
    command['forward'][bot_id] = min_forward_velocity
```

可见核心就只是系数乘偏差角，即可得到还算能用的控制效果。

除此之外，还有一些用于辅助控制的代码不在此处列出，比如接近目的地时减速刹车，基本也是通过 P 算法来实现。

### 避障

避障是基于 VO 算法思想，随手写的一个简易避障算法。因为没有精确的运动控制，只能沿用简单的 P 算法控制，再加上这是简单的单目标避障，最终效果并不好（特别是一个机器人跟在另一个机器人背后同向前进时）。以下是核心代码。

```python
# 计算碰撞区
collision_area_half_angle = numpy.arcsin(
    (bot_1_radius + bot_2_radius) / distance_list[bot_id_2])  # 碰撞区半角
# 适当增加碰撞区半角，但不超出最大值
if collision_area_half_angle * collision_area_half_angle_kp > numpy.pi / 2:
    collision_area_half_angle = numpy.pi / 2
else:
    collision_area_half_angle *= collision_area_half_angle_kp
collision_area_center_angle = calculate_angle_between_bot(bot_id_1, bot_id_2)  # 碰撞区中心方向角
collision_area_left_boundary_angle = collision_area_center_angle + collision_area_half_angle  # 碰撞区左边界方向角
collision_area_right_boundary_angle = collision_area_center_angle - collision_area_half_angle  # 碰撞区右边界角
# 计算机器人1相对于机器人2的速度
bot_1_relative_velocity_x = bot_1['linear_velocity'][0] - bot_2['linear_velocity'][0]  # x方向相对速度
bot_1_relative_velocity_y = bot_1['linear_velocity'][1] - bot_2['linear_velocity'][1]  # y方向相对速度
bot_1_relative_velocity_angle = numpy.arctan2(bot_1_relative_velocity_y,
                                                bot_1_relative_velocity_x)  # 相对速度方向
# 如果相对速度方向和碰撞区中心方向角之差大于pi（例如碰撞区是负角度，但相对速度方向在其+2pi后的正角度区间内）
if numpy.abs(bot_1_relative_velocity_angle - collision_area_center_angle) > numpy.pi:
    # 变换到同号区间
    if bot_1_relative_velocity_angle < 0:
        bot_1_relative_velocity_angle += 2 * numpy.pi
    elif bot_1_relative_velocity_angle > 0:
        bot_1_relative_velocity_angle -= 2 * numpy.pi
# 如果相对速度方向在碰撞区内则会发生碰撞（恰巧在边界会相切，所以也避免），需要避让
if collision_area_right_boundary_angle < bot_1_relative_velocity_angle < collision_area_left_boundary_angle:
    # 检测离哪边边界近就往哪边转，直接和中心方向角比较即可
    # 离右边界近
    if bot_1_relative_velocity_angle < collision_area_center_angle:
        command['rotate'][bot_id_1] = min_rotate_velocity + angular_velocity_kp * (
                collision_area_right_boundary_angle - bot_1_relative_velocity_angle)
    # 离左边界近
    elif bot_1_relative_velocity_angle > collision_area_center_angle:
        command['rotate'][bot_id_1] = min_rotate_velocity + angular_velocity_kp * (
                collision_area_left_boundary_angle - bot_1_relative_velocity_angle)
    # 恰好位于中间
    else:
        # 查看目前的角速度方向，往当前已有的角速度方向转，角速度为0则默认顺时针旋转
        # 角速度大于0，即逆时针旋转中
        if bot_1['angular_velocity'] > 0:
            command['rotate'][bot_id_1] = min_rotate_velocity + angular_velocity_kp * (
                    collision_area_left_boundary_angle - bot_1_relative_velocity_angle)
        # 角速度小于0，即顺时针旋转中
        elif bot_1['angular_velocity'] < 0:
            command['rotate'][bot_id_1] = min_rotate_velocity + angular_velocity_kp * (
                    collision_area_right_boundary_angle - bot_1_relative_velocity_angle)
        # 角速度为0，默认顺时针旋转
        else:
            command['rotate'][bot_id_1] = min_rotate_velocity + angular_velocity_kp * (
                    collision_area_right_boundary_angle - bot_1_relative_velocity_angle)
```

可见算法依然十分~~暴力~~简单，如果有更好的运动控制算法，避障算法也不至于做得这么简陋（算法其实后期优化过，但测试效果不好故没有保留）。至于上文所说的当一个机器人跟在另一个机器人背后同向而行时会出现问题，就是在这种情况下若被判定为会碰撞，两个机器人都会执行避让（实际上前面的机器人并不需要避让，甚至后面的也可能不需要避让），然后两个机器人都开始偏离目标角度并减速，最终导致两机器人相距很近相互纠缠着低速前进，直到分开。这个问题可以在出现这种情况时禁止前面的机器人执行避障来解决。

### 任务分配

任务分配的基础策略是根据产品优先级：`7 > (4, 5, 6) > (1, 2, 3)`，当机器人空闲的时候会按照此优先级去购买产品。对于同等优先级内的产品，采用的策略是机器人从当前位置到购买工作台的距离与从购买工作台到出售工作台的距离之和最短来选取购买和出售两个目标工作台。

除此之外还有几个强化策略，分别是抢占购买、原地购买、动态优先级和禁用工作台。

- **抢占购买**是当某机器人空闲时发现某已分配的任务由它来执行比原执行该任务的机器人剩余路径短得多，则抢占该任务执行，被抢占机器人重新分配任务。

- **原地购买**是当机器人出售完物品后，其所在工作台有需要购买的产品已生产完毕或剩余生产时间很短，则原地购买该工作台的产品去出售，这个策略也带有抢占性质。

- **动态优先级**（正式赛加入）是在某些 4、5、6 物品合成非常不平均的情况下使用的策略，通过改变产品优先级来优先分配合成当前数量较少的物品的任务，达到平衡 4、5、6 物品数量的目的，有利于物品 7 的合成。

- **禁用工作台**（正式赛加入）是当工作台数量过多时使用的策略，用于避免合成原料过于分散。虽然可以通过判断工作台原材料格情况来决定先出售到哪个工作台，以此使原料更集中，但是实际测试中发现通过简单直接的禁用部分工作台的方法即可解决这个问题并得到不错的效果。

### 正式赛针对性优化

动态优先级和禁用工作台策略实际上就是针对正式赛地图优化的产物，除此之外还有还有其他针对性的小措施，如调整出售工作台类别等，基本都没有通用性。

## 成绩

初赛正式赛四张图分数分别是 684678、771579、824985、641533，共 2922775 分，位列粤港澳赛区第 58 名（粤港澳真的太卷了啊）。

## 总结

不得不说，今年软挑的题目十分有趣好玩，赛题组也十分用心。看着小机器人从跌跌撞撞不会走路到丝滑移动甚至漂移避障，每一次改进策略后分数的提升都能给我带来一阵喜悦。

第一次参加软挑，没什么经验，大部分算法纯属自己瞎整，各种不想写复杂算法的妥协如滚雪球般慢慢积累，最终很多地方不得不一再妥协、简化，导致效果并不好，这是一大败笔。基础算法是一定要做好的，否则会影响后续各种算法的发挥。

总的来说，参赛体验十分不错，明年再战！

::github{repo=WJD1005/HUAWEI-CodeCraft2023}
