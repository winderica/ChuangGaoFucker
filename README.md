# ChuangGaoFucker

### How To Use

0. clone本仓库
1. 确保你的手机已经root，并已开启adb调试
2. 下载[Android Platform Tools](https://developer.android.com/studio/releases/platform-tools)，并解压
3. 确保已经安装`Python3`
4. 安装frida
    ```sh
    $ pip install frida
    ```
5. 下载对应架构的[frida-server](https://github.com/frida/frida/releases)，并解压
6. 连接手机，将frida-server运行在手机上
    ```sh
    $ cd platform-tools/ # 自行替换路径，不再赘述
    $ ./adb root
    $ ./adb push frida-server /data/local/tmp/
    $ ./adb shell "chmod 755 /data/local/tmp/frida-server"
    $ ./adb shell "/data/local/tmp/frida-server &"
    ```
    以后每次运行只需输入如下命令
    ```sh
    $ ./adb root
    $ ./adb shell "/data/local/tmp/frida-server &"
    ```
7. 为确保frida-server已经运行，输入
    ```sh
    $ frida-ps -U
    ```
    此时将输出进程列表。
8. 输入
    ```sh
    $ frida -l hooks.js -U -f net.crigh.cgsport --no-pause
    ```
    此时应用开启，进入开始跑步后直接结束即可完成。
    
    数据是随机且精心设计的，除了路线，有需要可自行更改`beganPoint`、`endPoint`、`points`，之后会加入更改路线的功能。
    
    若有报错的情况，请在`hook.js`中注释掉[第407行](https://github.com/featherin/ChuangGaoFucker/blob/294129a30a39b1c3630580f7a521b5c92e1b06e7/hooks.js#L407)；同时可能会伴随着重启，请享受这个过程。
    
    仍然没法执行，请提issue。

### TODO

* 用户自定义路线
* 原理
* 通过`frida-gadget`实现免root

### Notifications

* 想要改`hook.js`，请注意frida不支持ES6及其以上的特性
