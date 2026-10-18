---
title: 2023 华为嵌入式软件大赛复盘
published: 2023-07-07
description: '设计一套算法对光纤部署进行优化，主要解决在光网络中如何在满足多种约束的情况下（放大器约束、通道约束等）合理分配业务传输路径与选择通道，以及扩容光网络时如何合理安排使成本最小。'
image: 'https://res.cloudinary.com/rhc7o5mz/image/upload/blog/posts/huawei-control-rush-2023/cover.avif'
tags: [华为, 嵌入式, 算法, 比赛]
category: '比赛复盘'
slug: huawei-control-rush-2023
---

## 比赛简介

### 比赛主页

[2023 华为嵌入式软件大赛_华为云](https://developer.huaweicloud.com/contest/2023controlrush.html)

### 比赛题目

初赛：设计一套算法对光纤部署进行优化，主要解决在光网络中如何在满足多种约束的情况下（放大器约束、通道约束等）合理分配业务传输路径与选择通道，以及扩容光网络时如何合理安排使成本最小。

复赛：为了提高光网络的可靠性，部分光业务需要规划多条路径，这些路径同源同宿，但彼此之间不能有相同的边。当光业务的路径数量为 2 时，这两条路径分配的通道必须相同；当光业务的路径数量大于 2 时，这些路径分配的通道可以不同。

## 初赛策略

初赛期间主要设计了基本的分配与扩容方案，没有设计迭代优化算法来对已经分配好的光网络进行调整，导致成本不算特别低，只拿到了第三名的成绩。在初赛之后通过自主设计判题器来辅助测试，设计了新的网络迭代优化算法，成功使成本大幅度降低。以下对最终代码中的部分重要算法进行解析。

### 存图

采用链式前向星为基础存图方案，便于后续对一个节点出发的边进行遍历。按照赛题每一条边应为双向边，但为了链式前向星本身的特点和兼容性考虑，采用单向边存图，即对于每一条光网络中的边当作两条方向不同的单向边进行储存。

```c++
class Edge {
public:
    int from, to, d, next;    // 起点，终点，边的距离，同起点的下一条边在edge中的编号
    int trueD;    // 边的真正距离
    int Pile[maxP]; // 该边上存在的通道，记录的是当前承载的业务的编号，不承载业务时值为-1
    int usedPileCnt;
    Edge() {
        from = -1;
        to = -1;
        d = 0;
        next = -1;
    }
}edge[maxM];    // 边集数组
```

> 要注意 `d` 并非边的距离，因为寻路方案分为 Dijkstra 和 BFS，曾经在使用 Dijkstra 来模仿 BFS 来忽略距离进行最少边数搜索的时候将 `d` 置为 1 来实现，边真正的距离为 `trueD`。

### 业务寻路

在一开始寻路采用 Dijkstra 算法作为基础来搜寻最短路径，但实际上路径长度对成本的影响不大，如果业务只占用更少的边会对后续其他业务的分配更有利，故应该寻找最少边数。通过将边的 `d` 置为 1 即可使用 Dijkstra 寻找最少边数路径，后续直接使用 BFS 来实现，每一个使用 BFS 的函数都有对应的使用了 Dijkstra 算法的版本，可能因为遍历顺序的原因采用 `d` 全为 1 的 Dijkstra 算法进行寻路比采用 BFS 的成本略小，但是使用 BFS 可以使算法整体效率得到较大提升。以下仅说明以 BFS 为基础算法的函数，与之同序号的使用 Dijkstra 为基础算法的函数逻辑与功能均与之一致。

首先是 `BFS3`，用于寻找不考虑通道堵塞下的最短路径，就是一个纯粹的、无约束的 BFS 寻路，用于构建最短路径长度表方便后续实际寻路进行比较与判断。

```c++
void BFS3(Business& bus) {

    int start = bus.start, end = bus.end;

    if (minPathSize.find(make_pair(start, end)) != minPathSize.end())   // 键存在，无需再次查找
        return;

    bus.trueMinPath.resize(N, -1);
    for (int i = 0; i < N; ++i) { // 赋初值
        vis1[i] = false;
    }

    queue<pair<int, int>> bfsQ;
    bfsQ.push(make_pair(start, 0));
    vis1[start] = true;
    int s = start;
    int curLevel = 0;
    bool getOutFlag = false;

    while (!bfsQ.empty() && !getOutFlag) {

        s = bfsQ.front().first;
        curLevel = bfsQ.front().second;
        bfsQ.pop();

        for (int i = head[s]; i != -1; i = edge[i].next) {
            int t = edge[i].to;
            if (vis1[t])
                continue;
            vis1[t] = true;
            bus.trueMinPath[t] = i;    // 记录下抵达路径点t的边的编号i
            if (t == end) {
                getOutFlag = true;
                s = t;
                ++curLevel;
                break;
            }
            else {
                bfsQ.push(make_pair(t, curLevel + 1));
            }
        }
    }
    minPathSize[make_pair(start, end)] = curLevel;
}
```

`BFS1` 用于考虑通道的情况下寻找最少边数路径，基本逻辑是遍历每一条通道，然后使用 BFS 寻路，且在寻路时判断该边该通道是否已经被占用，被占用则该条边不能使用。有两个特殊情况就是如果在寻路之前已经调用过加边的函数，则找到一条路径即立刻跳出寻路，不再遍历其他通道，因为此时因为加了新边有很大概率是通畅的；另一个则是当找到的路径特别长时，放弃这条路径，因为特别长的路径虽然不会直接增加太多成本，但是会让整个网络更加堵塞，不利于全局降低成本。如果遍历完成依然找不到合适的路径，则先执行删边操作调整目前网络中冗余的边然后再执行加边。

```c++
void BFS1(Business& bus, bool ifLoadNewEdge) {

    int start = bus.start, end = bus.end, p = 0;
    static int addNewEdgeCnt = 0;  // 加边次数（不是边数）
    static int addNewBus = 0;   // 加业务次数
    ++addNewBus;
    bool findPath = false;
    int minPathDist = INF;
    int choosenP = -1;
    vector<int> tmpOKPath;
    double maxValue = -1;

    //调整通道遍历顺序有概率使业务分配得更均匀
    if (addNewBus % 2)
        p = 0;
    else
        p = P - 1;

    while (true) {
        if (addNewBus % 2) {
            ++p;
            if (p >= P)
                break;
        }
        else {
            --p;
            if (p < 0)
                break;
        }

        tmpOKPath.resize(N, -1);
        for (int i = 0; i < N; ++i) { // 赋初值
            vis1[i] = false;
        }
        queue<pair<int, int>> bfsQ;
        //queue<Node2> bfsq;
        bfsQ.push(make_pair(start, 0));
        //bfsq.push(Node2(start, 0, 0));
        vis1[start] = true;
        int s = start;
        int curLevel = 0;
        //int totUsedPileCnt = 0;
        bool getOutFlag = false;

        while (!bfsQ.empty() && !getOutFlag) {

            //Node2 tmpNode = bfsq.front();
            s = bfsQ.front().first;
            //s = tmpNode.nodeId;
            curLevel = bfsQ.front().second;
            //curLevel = tmpNode.curLevel;
            //totUsedPileCnt = tmpNode.usedPileCnt;
            bfsQ.pop();
            //bfsq.pop();

            for (int i = head[s]; i != -1; i = edge[i].next) {

                if (edge[i].Pile[p] == -1) {        // pile未被占用时，才试图走该边
                    int t = edge[i].to;
                    if (vis1[t])
                        continue;
                    vis1[t] = true;
                    tmpOKPath[t] = i;    // 记录下抵达路径点t的边的编号i

                    if (t == end) {
                        getOutFlag = true;
                        s = t;
                        ++curLevel;
                        //totUsedPileCnt += edge[i].usedPileCnt;
                        break;
                    }
                    else {
                        bfsQ.push(make_pair(t, curLevel + 1));
                        //bfsq.push(Node2(t, curLevel + 1, totUsedPileCnt + edge[i].usedPileCnt));
                    }
                }
            }
        }
        if (s == end) {

            //if (minPathSize.find(make_pair(start, end)) == minPathSize.end())   // 键不存在
            //    minPathSize[make_pair(start, end)] = curLevel;
            //else if (minPathSize[make_pair(start, end)] > curLevel) {
            //    minPathSize[make_pair(start, end)] = curLevel;
            //}

            if (minPathSize[make_pair(start, end)] * goodBadGap > curLevel)
                bus.isBusWellAllocate = true;
            else
                bus.isBusWellAllocate = false;

            if (ifLoadNewEdge) {    // 如果BFS1在调用前已经添加了新边，则可以一遍过
                bus.pathTmp = vector<int>(tmpOKPath.begin(), tmpOKPath.end());
                choosenP = p;
                findPath = true;
                break;
            }

            if (curLevel > 3 * minPathSize[make_pair(start, end)])  // 找到的路径长度太长，宁愿不要
                continue;

            int curNode = end, tmpDist = curLevel;
            if (tmpDist < minPathDist) {
                minPathDist = tmpDist;
                bus.pathTmp = vector<int>(tmpOKPath.begin(), tmpOKPath.end());
                choosenP = p;
            }
            findPath = true;
        }
    }
    if (findPath == false) {

        if (ifTryDeleteEdge) {
            if (T > 3500 && T <= 4000) {
                if (/*++addNewEdgeCnt % 2 == 0 && */(bus.start != buses[bus.busId - 1].start || bus.end != buses[bus.busId - 1].end))
                    tryDeleteEdge();
            }
            else
                if (/*++addNewEdgeCnt % 2 == 0 && */(bus.start != buses[bus.busId - 1].start || bus.end != buses[bus.busId - 1].end))
                    tryDeleteEdge();
        }

        //BFS2(bus);       // 旧的加边策略，一但加边，整个路径都会加，但全局性能是当前最好的
        BFS7(bus);       // 新加边策略，只加最短路径上需要进行加边的边
        return;
    }

    int curNode = end;
    bus.pileId = choosenP;
    while (bus.pathTmp[curNode] != -1) {
        int edgeId = bus.pathTmp[curNode];  // 存储于edge数组中真正的边的Id
        ++node[curNode].passBusCnt;     // 经过节点的业务数加1

        bus.path.push_back(edgeId / 2); // edgeId / 2是为了适应题目要求
        edge[edgeId].Pile[choosenP] = bus.busId;
        ++edge[edgeId].usedPileCnt;

        if (edgeId % 2) {   // 奇数-1
            edge[edgeId - 1].Pile[choosenP] = bus.busId;   // 双向边，两边一起处理
            ++edge[edgeId - 1].usedPileCnt;
        }
        else {  // 偶数+1
            edge[edgeId + 1].Pile[choosenP] = bus.busId;
            ++edge[edgeId + 1].usedPileCnt;
        }

        curNode = edge[bus.pathTmp[curNode]].from;
    }
    ++node[curNode].passBusCnt;     // 经过节点的业务数加1
    reverseArray(bus.path);
}
```

### 加边扩容

在业务寻路失败的时候，就需要进行加边操作，加边操作有两个函数，分别是 `BFS2` 和 `BFS7`。

`BFS2` 类似于 `BFS3`，是一个纯粹的 BFS 无约束寻路，其加边思想为不考虑通道堵塞直接寻找最少边数路径，然后直接对整条路径上的所有原有的边都进行加边操作，然后重新交给 `BFS1` 进行寻路。

```c++
void BFS2(Business& bus) {

    int start = bus.start, end = bus.end;

    bus.trueMinPath.resize(N, -1);
    for (int i = 0; i < N; ++i) { // 赋初值
        vis1[i] = false;
    }

    queue<pair<int, int>> bfsQ;
    bfsQ.push(make_pair(start, 0));
    vis1[start] = true;
    int s = start;
    int curLevel = 0;
    bool getOutFlag = false;

    while (!bfsQ.empty() && !getOutFlag) {

        s = bfsQ.front().first;
        curLevel = bfsQ.front().second;
        bfsQ.pop();

        for (int i = head[s]; i != -1; i = edge[i].next) {
            int t = edge[i].to;
            if (vis1[t])
                continue;
            vis1[t] = true;
            bus.trueMinPath[t] = i;    // 记录下抵达路径点t的边的编号i
            if (t == end) {
                getOutFlag = true;
                s = t;
                break;
            }
            else {
                bfsQ.push(make_pair(t, curLevel + 1));
            }
        }

    }

    int curNode = end;
    while (bus.trueMinPath[curNode] != -1) {
        int edgeId = bus.trueMinPath[curNode];  // 存储于edge数组中真正的边的Id

        addEdge(edge[edgeId].from, edge[edgeId].to, minDist[make_pair(edge[edgeId].from, edge[edgeId].to)]);
        addEdge(edge[edgeId].to, edge[edgeId].from, minDist[make_pair(edge[edgeId].to, edge[edgeId].from)]);

        if (edge[edgeId].from < edge[edgeId].to)
            newEdge.emplace_back(edge[edgeId].from, edge[edgeId].to);
        else
            newEdge.emplace_back(edge[edgeId].to, edge[edgeId].from);
        newEdgePathId.emplace_back(cntEdge / 2 - 1);

        curNode = edge[bus.trueMinPath[curNode]].from;
    }
    BFS1(bus, true);
}
```

`BFS2` 是最原始的加边策略，毫无疑问这样的加边策略会导致加很多没有用上的边，从单个业务的效果上来看成本巨大，于是便有了 `BFS7`。`BFS7` 的加边思想是先不考虑堵塞寻找最少边数路径，然后在这条路径上搜索所有通道，选择堵塞边数最少的通道，对路径上这个通道堵塞的边进行加边，也就是在不考虑堵塞的最少边数路径上加最少的边。所以虽然 `BFS7` 加边数少了很多，但其依然不是最少的，因为是先选定了不考虑堵塞的最少边数路径，但是很有可能选择其他路径需要加边的数量会更少。这种加边数最少的策略我也尝试过，但是由于其计算复杂度稍高，且效果并不好（具体原因下面会分析），最终没有应用，此处不做说明。

```c++
void BFS7(Business& bus) {

    int start = bus.start, end = bus.end;
    int minBlockEdge = INF;
    int choosenP = -1;
    vector<int> tmpOKPath;
    tmpOKPath.resize(N, -1);
    for (int i = 0; i < N; ++i) { // 赋初值
        vis1[i] = false;
    }
    queue<pair<int, int>> bfsQ;
    bfsQ.push(make_pair(start, 0));
    vis1[start] = true;
    int s = start;
    int curLevel = 0;
    bool getOutFlag = false;

    while (!bfsQ.empty() && !getOutFlag) {

        s = bfsQ.front().first;
        curLevel = bfsQ.front().second;
        bfsQ.pop();

        for (int i = head[s]; i != -1; i = edge[i].next) {

            int t = edge[i].to;
            if (vis1[t])
                continue;
            vis1[t] = true;
            tmpOKPath[t] = i;    // 记录下抵达路径点t的边的编号i

            if (t == end) {
                getOutFlag = true;
                s = t;
                ++curLevel;
                break;
            }
            else
                bfsQ.push(make_pair(t, curLevel + 1));
        }

    }
    for (int p = 0; p < P; ++p) {

        int curNode = end, tmpBlockEdge = 0;
        while (tmpOKPath[curNode] != -1) {
            int edgeId = tmpOKPath[curNode];  // 存储于edge数组中真正的边的Id
            if (edge[edgeId].Pile[p] != -1)
                ++tmpBlockEdge;
            curNode = edge[edgeId].from;
        }

        if (tmpBlockEdge < minBlockEdge) {   // 选需要加边数最少的通道
            minBlockEdge = tmpBlockEdge;
            bus.pathTmp = vector<int>(tmpOKPath.begin(), tmpOKPath.end());
            choosenP = p;
        }
    }

    int curNode = end;
    bus.pileId = choosenP;
    while (bus.pathTmp[curNode] != -1) {
        int edgeId = bus.pathTmp[curNode];  // 存储于edge数组中真正的边的Id
        int lastNode = curNode;
        ++node[curNode].passBusCnt;     // 经过节点的业务数加1
        curNode = edge[bus.pathTmp[curNode]].from;

        if (edge[edgeId].Pile[choosenP] == -1) {    // 无需加边
            bus.path.push_back(edgeId / 2); // edgeId / 2是为了适应题目要求
            edge[edgeId].Pile[choosenP] = bus.busId;
            ++edge[edgeId].usedPileCnt;

            if (edgeId % 2) {   // 奇数-1
                edge[edgeId - 1].Pile[choosenP] = bus.busId;   // 双向边，两边一起处理
                ++edge[edgeId - 1].usedPileCnt;
            }
            else {  // 偶数+1
                edge[edgeId + 1].Pile[choosenP] = bus.busId;
                ++edge[edgeId + 1].usedPileCnt;
            }
        }
        else {      // 需要加边
            addEdge(edge[edgeId].from, edge[edgeId].to, minDist[make_pair(edge[edgeId].from, edge[edgeId].to)]);
            addEdge(edge[edgeId].to, edge[edgeId].from, minDist[make_pair(edge[edgeId].to, edge[edgeId].from)]);

            if (edge[edgeId].from < edge[edgeId].to)
                newEdge.emplace_back(edge[edgeId].from, edge[edgeId].to);
            else
                newEdge.emplace_back(edge[edgeId].to, edge[edgeId].from);
            newEdgePathId.emplace_back(cntEdge / 2 - 1);

            bus.path.push_back(cntEdge / 2 - 1); // edgeId / 2是为了适应题目要求
            edge[cntEdge - 2].Pile[choosenP] = bus.busId;
            ++edge[cntEdge - 2].usedPileCnt;
            edge[cntEdge - 1].Pile[choosenP] = bus.busId;   // 偶数+1
            ++edge[cntEdge - 1].usedPileCnt;
            bus.pathTmp[lastNode] = cntEdge - 2;
        }
    }
    ++node[curNode].passBusCnt;     // 经过节点的业务数加1
    reverseArray(bus.path);
    bus.isBusWellAllocate = true;
}
```

在 `BFS2` 与 `BFS7` 两种加边策略之间，我们最终选择了 `BFS2`。因为虽然 `BFS7` 加边数量比 `BFS2` 少，但是这只是对一个业务而言，我们的总体目标是让全局成本最低，`BFS2` 虽然对一个业务加的边多了，但是多加的边能在一定程度上缓解网络的堵塞情况，便于后续业务的分配，上文所说到的加边数量最少的算法效果不好也是因为这个原因。再加之 `BFS2` 虽然加边数量多了，但后续还有删除冗余边和迭代优化分配的算法对网络进行调整，最终并不会存在太多多余的边。实际测试结果也说明了这个问题，`BFS2` 的全局性能确实是最好的。

### 删除冗余边

删除冗余边是降低成本的一个重要部分，其主要思想是统计新增的边上承载的业务数量，若没有承载业务就直接删除；若承载了业务就先保存这条边上的业务的路径，然后对这些业务进行重新分配（这也是后续迭代优化的基本思想），重新分配时不走正在考察这条边，看看能否不使用这条边把原本在这条边上的业务全部分配完成，若可以，则证明这条边为冗余边，可以删除，若不可以，则用保存的原路径复原重新分配寻路时造成的影响。

重新分配采用 `BFS5`，类似于 `BFS1`，区别在于 `BFS5` 不会触发加边操作，如果找不到符合要求的路径会直接返回 `false`，标志该业务确实要依赖这条新增的边，即这条边不可以删除。

```c++
bool BFS5(Business& bus, int blockEdge) {

    int start = bus.start, end = bus.end, p = 0;

    bool findPath = false;
    int minPathDist = INF;
    int choosenP = -1;
    vector<int> tmpOKPath;

    for (; p < P; ++p) {
        tmpOKPath.resize(N, -1);
        for (int i = 0; i < N; ++i) { // 赋初值
            vis1[i] = false;
        }
        queue<pair<int, int>> bfsQ;
        bfsQ.push(make_pair(start, 0));
        vis1[start] = true;
        int s = start;
        int curLevel = 0;
        bool getOutFlag = false;

        while (!bfsQ.empty() && !getOutFlag) {

            s = bfsQ.front().first;
            curLevel = bfsQ.front().second;
            bfsQ.pop();

            for (int i = head[s]; i != -1; i = edge[i].next) {

                if (i / 2 == blockEdge)
                    continue;

                if (edge[i].Pile[p] == -1) {        // pile未被占用时，才试图走该边
                    int t = edge[i].to;
                    if (vis1[t])
                        continue;
                    vis1[t] = true;
                    tmpOKPath[t] = i;    // 记录下抵达路径点t的边的编号i

                    if (t == end) {
                        getOutFlag = true;
                        s = t;
                        ++curLevel;
                        break;
                    }
                    else {
                        bfsQ.push(make_pair(t, curLevel + 1));
                    }
                }
            }
        }
        if (s == end) {

            // 找到的路径长度太长，宁愿不要
            if (!ifLast && (curLevel > 3 * minPathSize[make_pair(start, end)]))
                continue;

            if (minPathSize[make_pair(start, end)] == curLevel)
                bus.isBusWellAllocate = true;
            else
                bus.isBusWellAllocate = false;

            int curNode = end, tmpDist = curLevel;
            if (tmpDist <= minPathDist) {
                minPathDist = tmpDist;
                bus.pathTmp = vector<int>(tmpOKPath.begin(), tmpOKPath.end());
                choosenP = p;
            }
            findPath = true;
        }
    }
    if (findPath == false) {    // 找不到路，需要构造新边
        return false;
    }

    int curNode = end;
    bus.pileId = choosenP;
    while (bus.pathTmp[curNode] != -1) {
        int edgeId = bus.pathTmp[curNode];  // 存储于edge数组中真正的边的Id
        ++node[curNode].passBusCnt;     // 经过节点的业务数加1

        bus.path.push_back(edgeId / 2); // edgeId / 2是为了适应题目要求
        edge[edgeId].Pile[choosenP] = bus.busId;
        ++edge[edgeId].usedPileCnt;

        if (edgeId % 2) {   // 奇数-1
            edge[edgeId - 1].Pile[choosenP] = bus.busId;   // 双向边，两边一起处理
            ++edge[edgeId - 1].usedPileCnt;
        }
        else {  // 偶数+1
            edge[edgeId + 1].Pile[choosenP] = bus.busId;
            ++edge[edgeId + 1].usedPileCnt;
        }

        curNode = edge[bus.pathTmp[curNode]].from;
    }
    ++node[curNode].passBusCnt;     // 经过节点的业务数加1
    reverseArray(bus.path);
    return true;
}

void tryDeleteEdge() {

    int n = newEdge.size(), trueEdgeId;
    for (int idx = 0; idx < n; ++idx) {
        int idxEdge = newEdgePathId[idx]; // idxEdge为边在边集数组的编号（计数时，双向边视作同一边）  

        trueEdgeId = idxEdge * 2;
        int busCnt = 0;     // 记录边上承载的业务数
        vector<int> lastBusIds, lastPileIds;

        for (int j = 0; j < P; ++j)
            if (edge[trueEdgeId].Pile[j] != -1 && edge[trueEdgeId].Pile[j] != T) {   // 说明在通道j上承载了该业务
                ++busCnt;
                lastBusIds.push_back(edge[trueEdgeId].Pile[j]);
                lastPileIds.push_back(j);
            }

        if (busCnt == 0) {      // 如果该新边上，一条业务都没有承载，直接删边

            int iter = find(newEdgePathId.begin(), newEdgePathId.end(), idxEdge) - newEdgePathId.begin();
            newEdge.erase(newEdge.begin() + iter);
            newEdgePathId.erase(newEdgePathId.begin() + iter);
            --idx;
            --n;

            for (int k = 0; k < P; ++k) {   // 该边已删除，就应对其进行封锁
                edge[trueEdgeId].Pile[k] = T;
                edge[trueEdgeId + 1].Pile[k] = T;   // 偶数+1
            }
        }
        else {  // 如果该新边上，承载了多条业务，则对该边上的所有业务重新分配，看能否不依赖该新边

            vector<vector<int>> pathTmp(busCnt, vector<int>());     // 用于此后重新加载边
            for (int k = 0; k < busCnt; ++k) {
                pathTmp[k] = buses[lastBusIds[k]].pathTmp;
                reCoverNetwork(lastBusIds[k], lastPileIds[k]);
            }

            bool findPath = false;
            int stopK = -1;
            vector<int> tmpLastPileIds;
            for (int k = 0; k < busCnt; ++k) {

                findPath = BFS5(buses[lastBusIds[k]], idxEdge);
                //findPath = dijkstra5(buses[lastBusIds[k]], idxEdge);

                if (findPath == false) {
                    stopK = k;
                    break;
                }
                tmpLastPileIds.push_back(buses[lastBusIds[k]].pileId);   // 原本的pileId已改变，此处进行更新，以防止reCoverNetwork时出bug
            }

            if (findPath) {

                int iter = find(newEdgePathId.begin(), newEdgePathId.end(), idxEdge) - newEdgePathId.begin();
                newEdge.erase(newEdge.begin() + iter);
                newEdgePathId.erase(newEdgePathId.begin() + iter);
                --idx;
                --n;

                for (int k = 0; k < P; ++k) {   // 该边已删除，就应对其进行封锁
                    edge[trueEdgeId].Pile[k] = T;
                    edge[trueEdgeId + 1].Pile[k] = T;   // 偶数+1
                }

                for (int k = 0; k < busCnt; ++k) {

                    vector<int> nullVector;
                    buses[lastBusIds[k]].mutiplierId.swap(nullVector);
                    buses[lastBusIds[k]].curA = D;

                    addMultiplier(buses[lastBusIds[k]], lastBusIds[k]);

                }

            }
            else {

                for (int k = 0; k < stopK; ++k) {   // 把试图寻路时，造成的对网络的影响消除
                    reCoverNetwork(lastBusIds[k], tmpLastPileIds[k]);
                }

                for (int k = 0; k < busCnt; ++k) {  // 重新加载所有的边
                    vector<int> nullVector, nullPath1, nullPath2;
                    buses[lastBusIds[k]].mutiplierId.swap(nullVector);
                    buses[lastBusIds[k]].path.swap(nullPath1);
                    buses[lastBusIds[k]].pathTmp.swap(nullPath2);

                    buses[lastBusIds[k]].pileId = -1;
                    buses[lastBusIds[k]].curA = D;
                    reloadBus(lastBusIds[k], lastPileIds[k], pathTmp[k]);
                }
            }
        }
    }
}
```

### 迭代优化

迭代优化是在初赛结束之后才做出来的算法，故无法得知用上迭代优化后在初赛中可以获得怎样的成绩。但是就本地测试来看，它通过在规定的测试时间内进行多次迭代，可以搭配计时完美利用分配完成后剩余的大量时间对网络进行调整优化，可以大幅度降低成本。

迭代优化的过程其实类似于删边，先把需要迭代的业务保存下来，然后进行重新分配，将重新分配的结果与原本的分配结果比较看看有无进步，若有进步则保留，无进步则还原之前的状态。这样持续迭代多次，进步就能累积下去得到更好的结果。

迭代优化的方案有很多，我们做过四个方案，分别是 `reAllocateBus1`--`reAllocateBus4`，四个方案的区别主要在于评判重新分配的结果的标准或过程中的约束。四个方案都是先随机出一个 `gap`，然后从业务中一次随机抽取 `gap` 个业务作为一个单位去考察重新分配后有无更好，这个抽取过程在一次迭代中会重复多次，具体视总体业务量来确定，抽取次数过多会影响效率进而减少迭代次数使效果变差。

`reAllocateBus1` 对重新分配结果的评判标准为总的边数是否减少，若总边数减少则认为成功，采用重新分配的结果。其在进行重新分配寻路的时候允许进行加边操作，以求获得较好的路径。

```c++
void reAllocateBus1(int HLim) {

    int gap = max(int(0.025 * T), 20);
    if (gap > T)
        return;

    vector<int> busIdx(gap, 0);

    for (int i = 0; i + gap < HLim; i = i + gap) {

        srand(42);  // 设置随机数种子  
        random_shuffle(totBusIdx.begin(), totBusIdx.end());
        for (int i = 0; i < gap; ++i) {
            busIdx[i] = totBusIdx[i];
        }        

        int oriEdgeNum = 0;

        vector<vector<int>> pathTmp1(gap, vector<int>());     // 用于此后重新加载边
        vector<int> pileTmp1(gap, -1);
        for (int j = i, busId; j < i + gap; ++j) {
            busId = busIdx[j - i];
            oriEdgeNum += buses[busId].path.size();
            pathTmp1[j - i] = buses[busId].pathTmp;
            pileTmp1[j - i] = buses[busId].pileId;
            reCoverNetwork(busId, buses[busId].pileId);
        }

        int curEdgeNum = 0;
        bool findPath = false;
        vector<int> pileTmp2(gap, -1);
        for (int j = i + gap - 1, busId; j >= i; --j) {
            busId = busIdx[j - i];
            loadBus(busId, false);
            pileTmp2[j - i] = buses[busId].pileId;
            curEdgeNum += buses[busId].path.size();
        }

        if (1.05 * curEdgeNum < oriEdgeNum) {  // 总体的边数减少，接受迁移
            continue;
        }
        else {  // 否则，回复原状态
            for (int j = i + gap - 1, busId; j >= i; --j) {   // 把试图寻路时，造成的对网络的影响消除
                busId = busIdx[j - i];
                reCoverNetwork(busId, pileTmp2[j - i]);
            }

            for (int j = i, busId; j < i + gap; ++j) {  // 重新加载所有的边
                vector<int> nullVector, nullPath1, nullPath2;
                busId = busIdx[j - i];
                buses[busId].mutiplierId.swap(nullVector);
                buses[busId].path.swap(nullPath1);
                buses[busId].pathTmp.swap(nullPath2);

                buses[busId].pileId = -1;
                buses[busId].curA = D;
                reloadBus(busId, pileTmp1[j - i], pathTmp1[j - i]);
            }
        }
    }
}
```

`reAllocateBus2` 对重新分配结果的评判标准也是总路径边数是否减少，与 `reAllocateBus1` 的区别在于在重新分配寻路的过程中不允许加边操作，避免迭代过程继续加边，试图减小加边数。但经过实测效果并不好，依然存在全局性能不好的问题。

```c++
void reAllocateBus2(int HLim) {

    int gap = max(int(0.05 * T), 20);
    if (gap > T)
        return;
    vector<int> totBusIdx(T, 0);
    vector<int> busIdx(gap, 0);
    for (int i = 0; i < T; ++i)
        totBusIdx[i] = i;

    for (int i = 0; i + gap < HLim; i = i + gap) {

        srand(time(NULL));  // 设置随机数种子  
        random_shuffle(totBusIdx.begin(), totBusIdx.end());
        for (int k = 0; k < gap; ++k) {
            busIdx[k] = totBusIdx[k];
        }

        int oriEdgeNum = 0;

        vector<vector<int>> pathTmp1(gap, vector<int>());     // 用于此后重新加载边
        vector<int> pileTmp1(gap, -1);
        for (int j = i, busId; j < i + gap; ++j) {
            busId = busIdx[j - i];
            oriEdgeNum += buses[busId].path.size();
            pathTmp1[j - i] = buses[busId].pathTmp;
            pileTmp1[j - i] = buses[busId].pileId;
            reCoverNetwork(busId, buses[busId].pileId);
        }

        int curEdgeNum = 0;
        bool findPath = false;
        vector<vector<int>> pathTmp2(gap, vector<int>());     // 用于此后重新加载边
        vector<int> pileTmp2(gap, -1);

        for (int j = i + gap - 1, busId; j >= i; --j) {

            busId = busIdx[j - i];
            findPath = BFS5(buses[busId], -1);
            if (findPath) {
                pathTmp2[j - i] = buses[busId].pathTmp;
                pileTmp2[j - i] = buses[busId].pileId;
                curEdgeNum += buses[busId].path.size();

                int curNode = buses[busId].start, trueNextEdgeId;
                for (int i = 0; i < buses[busId].path.size(); ++i) {

                    if (edge[buses[busId].path[i] * 2].from == curNode)
                        trueNextEdgeId = buses[busId].path[i] * 2;
                    else
                        trueNextEdgeId = buses[busId].path[i] * 2 + 1;
                    curNode = edge[trueNextEdgeId].to;

                    if (buses[busId].curA >= edge[trueNextEdgeId].trueD) {
                        buses[busId].curA -= edge[trueNextEdgeId].trueD;
                    }
                    else {
                        node[edge[trueNextEdgeId].from].Multiplier[buses[busId].pileId] = buses[busId].pileId;
                        buses[busId].curA = D;
                        buses[busId].curA -= edge[trueNextEdgeId].trueD;
                        buses[busId].mutiplierId.push_back(edge[trueNextEdgeId].from);
                    }
                }
            }
            else {  // BFS5找不到路时，不会对网络和业务产生任何影响
                findPath = false;
                break;
            }
        }

        if (findPath && 1.025 * curEdgeNum < oriEdgeNum) {  // 总体的边数减少，接受迁移
            continue;
        }
        else {  // 否则，回复原状态
            for (int j = i + gap - 1, busId; j >= i; --j) {   // 把试图寻路时，造成的对网络的影响消除     
                if (pathTmp2[j - i].size() == 0)        // 该业务寻路失败，对网络不造成影响
                    continue;
                busId = busIdx[j - i];
                reCoverNetwork(busId, pileTmp2[j - i]);
            }

            for (int j = i, busId; j < i + gap; ++j) {  // 重新加载所有的边

                vector<int> nullVector, nullPath1, nullPath2;
                busId = busIdx[j - i];
                buses[busId].mutiplierId.swap(nullVector);
                buses[busId].path.swap(nullPath1);
                buses[busId].pathTmp.swap(nullPath2);

                buses[busId].pileId = -1;
                buses[busId].curA = D;
                reloadBus(busId, pileTmp1[j - i], pathTmp1[j - i]);
            }
        }
    }
}
```

`reAllocateBus3` 对重新分配结果的评判标准也是总路径边数是否减少，但是在挑选迭代业务时有所不同。它先考察每一个业务所经过的路径长度是否小于 `最短路径长度*goofBadGap`，以此分离出“分配良好”和“分配不良好”的业务。然后它以某一概率抽取“不良好”的业务，剩余则从“良好”中抽取，以此尽可能试图抽出较多“不良好”的业务进行重新分配。

```c++
void reAllocateBus3(int HLim) {

    int gap = max(int(0.025 * T), 20);
    if (gap > T)
        return;

    double ratio = 0.5;     // 以ratio的概率，选择不良好的业务进行分配
    vector<int> goodBusId;  // 良好分配的业务，“良好”的定义是该业务所经过的路径长度小于最短路径长度*goofBadGap
    vector<int> badBusId;   // 不良好分配的业务
    for (int i = 0; i < T; ++i)
        if (buses[i].isBusWellAllocate)
            goodBusId.push_back(i);
        else
            badBusId.push_back(i);

    vector<int> busIdx(gap, 0);

    for (int i = 0; i + gap < HLim; i = i + gap) {

        srand(time(NULL) + rand() % 1000);  // 设置随机数种子  
        random_shuffle(goodBusId.begin(), goodBusId.end());
        random_shuffle(badBusId.begin(), badBusId.end());
        int goodBusSize = goodBusId.size(), badBusSize = badBusId.size();
        
        for (int j = 0, m = 0, n = 0; j < gap; ++j) {
            
            if (n >= goodBusSize) {
                busIdx[j] = badBusId[m++];
                continue;
            }
            if (m >= badBusSize) {
                busIdx[j] = goodBusId[n++];
                continue;
            }
            double curRatio = (double)(rand()) / RAND_MAX;
            if (curRatio < ratio)   // 以ratio的概率，选择不良好的业务进行分配
                busIdx[j] = badBusId[m++];
            else
                busIdx[j] = goodBusId[n++];
        }

        int oriEdgeNum = 0;
        vector<vector<int>> pathTmp1(gap, vector<int>());     // 用于此后重新加载边
        vector<int> pileTmp1(gap, -1);
        for (int j = i, busId; j < i + gap; ++j) {
            busId = busIdx[j - i];
            oriEdgeNum += buses[busId].path.size();
            pathTmp1[j - i] = buses[busId].pathTmp;
            pileTmp1[j - i] = buses[busId].pileId;
            reCoverNetwork(busId, buses[busId].pileId);
        }

        int oriCntEdge = cntEdge;
        int curEdgeNum = 0;
        bool findPath = false;
        vector<int> pileTmp2(gap, -1);
        for (int j = i + gap - 1, busId; j >= i; --j) {
            busId = busIdx[j - i];
            loadBus(busId, false);
            pileTmp2[j - i] = buses[busId].pileId;
            curEdgeNum += buses[busId].path.size();
        }

        if (1.05 * curEdgeNum < oriEdgeNum) {  // 总体的边数减少，接受迁移
            continue;
        }
        else {  // 否则，回复原状态
            for (int j = i + gap - 1, busId; j >= i; --j) {   // 把试图寻路时，造成的对网络的影响消除
                busId = busIdx[j - i];
                reCoverNetwork(busId, pileTmp2[j - i]);
            }

            for (int j = i, busId; j < i + gap; ++j) {  // 重新加载所有的边
                vector<int> nullVector, nullPath1, nullPath2;
                busId = busIdx[j - i];
                buses[busId].mutiplierId.swap(nullVector);
                buses[busId].path.swap(nullPath1);
                buses[busId].pathTmp.swap(nullPath2);

                buses[busId].pileId = -1;
                buses[busId].curA = D;
                reloadBus(busId, pileTmp1[j - i], pathTmp1[j - i]);
            }

            // 在这里利用cntEdge的变化来及时删除无用新边
            //for (int j = oriCntEdge; j < cntEdge; j = j + 2) {

            //    int iter = find(newEdgePathId.begin(), newEdgePathId.end(), j / 2) - newEdgePathId.begin();
            //    newEdge.erase(newEdge.begin() + iter);
            //    newEdgePathId.erase(newEdgePathId.begin() + iter);

            //    for (int k = 0; k < P; ++k) {   // 该边已删除，就应对其进行封锁
            //        edge[j].Pile[k] = T;
            //        edge[j + 1].Pile[k] = T;   // 偶数+1
            //    }
            //}
        }
    }
}
```
`reAllocateBus4` 将重新分配结果的评判统计量从边的数量改为边的利用率，比单纯关注边数更有全局意义，实测效果也更好，收敛速度更快。但是其中有一个疑惑的地方，理论上来说边的利用率应越大越好，但实际上把接受重新分配结果的标准定为 `重新分配后的边的利用率<重新分配前的边的利用率` 可以使成本大幅下降（但不能保证每次迭代成本递减），这个完全相反的逻辑是目前仍未想明白的。

```c++
void reAllocateBus4(int HLim) {

    int gap = max(int(0.025 * T), 20);
    if (gap > T)
        return;

    vector<int> busIdx(gap, 0);

    for (int i = 0; i + gap < HLim; i = i + gap) {

        srand(42);  // 设置随机数种子  
        random_shuffle(totBusIdx.begin(), totBusIdx.end());
        for (int i = 0; i < gap; ++i) {
            busIdx[i] = totBusIdx[i];
        }

        int oriEdgeNum = 0, oriFullEdge = 0;
        unordered_set<int> mark1;
        unordered_set<int> mark2;
        for (int j = i; j < i + gap; ++j) {
            oriEdgeNum += countEdgeNum(buses[busIdx[j - i]].path, mark1);
            oriFullEdge += testEdgeFull(buses[busIdx[j - i]].path, mark2);
        }

        vector<vector<int>> pathTmp1(gap, vector<int>());     // 用于此后重新加载边
        vector<int> pileTmp1(gap, -1);
        for (int j = i, busId; j < i + gap; ++j) {
            busId = busIdx[j - i];
            pathTmp1[j - i] = buses[busId].pathTmp;
            pileTmp1[j - i] = buses[busId].pileId;
            reCoverNetwork(busId, buses[busId].pileId);
        }

        int curEdgeNum = 0, curFullEdge = 0;
        bool findPath = false;
        vector<int> pileTmp2(gap, -1);
        for (int j = i + gap - 1, busId; j >= i; --j) {
            busId = busIdx[j - i];
            loadBus(busId, false);
            pileTmp2[j - i] = buses[busId].pileId;
            curEdgeNum += buses[busId].path.size();
        }
        unordered_set<int> mark3;
        unordered_set<int> mark4;
        for (int j = i; j < i + gap; ++j) {
            curEdgeNum += countEdgeNum(buses[busIdx[j - i]].path, mark3);
            curFullEdge += testEdgeFull(buses[busIdx[j - i]].path, mark4);
        }

        if (curFullEdge * oriEdgeNum < oriFullEdge * curEdgeNum) {  // 边的利用效率下降，接受迁移
            continue;

        }
        else {  // 否则，回复原状态
            for (int j = i + gap - 1, busId; j >= i; --j) {   // 把试图寻路时，造成的对网络的影响消除
                busId = busIdx[j - i];
                reCoverNetwork(busId, pileTmp2[j - i]);
            }

            for (int j = i, busId; j < i + gap; ++j) {  // 重新加载所有的边
                vector<int> nullVector, nullPath1, nullPath2;
                busId = busIdx[j - i];
                buses[busId].mutiplierId.swap(nullVector);
                buses[busId].path.swap(nullPath1);
                buses[busId].pathTmp.swap(nullPath2);

                buses[busId].pileId = -1;
                buses[busId].curA = D;
                reloadBus(busId, pileTmp1[j - i], pathTmp1[j - i]);
            }
        }
    }
}
```

通过实际测试，我们最终选定了使用 `reAllocateBus4`，因为它拥有最好的全局性能与较快的收敛速度。迭代优化需要与删边协作使用，才能在迭代优化调整之后删除冗余边。由于 `reAllocateBus4` 不能确保每次迭代成本递减（但是一般都能减小到一个较低的成本后再发生小幅波动），所以后来增加了保存迭代过程中成本最低网络的功能，并且最后输出这个成本最低的网络。

### 其他

其他一些比较简单的算法（如添加放大器等）和上述主要算法的一些辅助函数在此不做说明，还有许多测试性的小优化方案如业务分配排序（根据起点终点分组或最短路径长度）由于应用场景有限未加入到主要代码中。

## 初赛判题器

由于迭代优化算法是在初赛结束之后才开始做的，线上判题入口已经关闭，便自己写了一个简单的判题器用于判断输出的结果是否合法、评判分数和计时，在这个过程中学到了一些有意思的东西。

### 启动参数

在使用命令行启动可执行文件时，`main()` 是可以传参的，如：

```c++
int main(int argc, char** argv) {}
```

- `argc` 为参数个数，要注意可执行文件名本身就算一个参数。
- `argv` 是参数列表，是一个字符串数组指针，可以从中读出每一个参数。

> 如在命令行运行时输入：`Judger.exe main.exe`，则 `argc` 为 `2`，`argv` 所指数组为 `["Judger.exe", "main.exe"]`。

### 管道通信

这个判题器采用管道实现与解题程序的通信。由于管道是单工通信，故需要建立两条管道才能实现双工通信，但是由于比较繁琐最终放弃了双向通信，判题器只接收解题程序输出的结果，而输入则由用户输入。程序之间单向通信的管道的建立十分简单。

```c++
// 读
FILE* pipe = _popen(programName, "r");
// 写
FILE* pipe = _popen(programName, "w");
```

通过这一行代码即可同时做到在命令窗口内拉起目标程序已经建立对应的读或写的管道。目标程序被拉起后会在同一个命令窗口中与主程序同时运行，若此时管道为读，目标程序的标准输入流就依然是命令窗口输入，标准输出则接到了管道上，可由主程序使用 `fscanf()` 读取；若此时管道为写，目标程序的标准输入流接到管道上，可由主程序使用 `fprintf()` 写入，而标准输出依然是命令窗口输出。

## 复赛策略

复赛主要是增加了一个业务需要找出多条路径的需求，并且对这多条路径有一定约束。理论上来说只需在代码中增加寻找多条路径的处理方法，并且按约束条件在寻找多条路径时对已经选择过的边进行封锁即可简单解决，但是比赛的时候这么做却一直在超时。赛后在本地自造数据集后调试的时候发现，当前的策略存在某种问题，直接这样修改会导致加边数量巨大，使得网络复杂度快速上升，寻路算法的性能快速下降，从而导致超时。

从赛后复盘看来，应该优先给需要分配两条路径的业务（有约束）分配路径，并且采用新的加边策略，寻路算法使用双向 BFS 来提高在复杂网络下寻路的效率，才能较好的解决这个问题。

## 成绩

初赛期间未使用迭代优化算法获得粤港澳上合赛区第三名，若加上迭代优化算法有望登顶。复赛由于在比赛的 4 个小时中未能解决超时问题未能出分，十分遗憾！

## 总结

团队比赛的优势在于可以集思广益，能有志同道合的人一起讨论问题、一起解决问题是十分幸福的一件事情，非常感谢强大的队友不断有新的想法去尝试。

虽然复赛没有出理想的成绩，但是借此机会来到了华为的欧洲小镇，坐着小火车感受了这一带的风景与氛围，在夕阳之下躺在广阔的草地上打滚，和华为工程师一起共进晚宴，探讨行业前沿信息……参赛体验十分不错，非常感谢华为光产品线提供的这次机会，明年再做追光者！

::github{repo="WJD1005/HUAWEI-ControlRush2023"}
