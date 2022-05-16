import json
import os
import pandas as pd

first_timestamp = -1
overuse_count = 0
file_seq = 0
diff = 0
pre_overuse_time = 0

diff_overuse_time_list = []
now_overuse_time_list = []

# 传入路径，将该文件夹中的文件名保存到list_name
def listdir(path, list_name):
    for file in os.listdir(path):
        file_path = os.path.join(path, file)
        if os.path.isdir(file_path):
            listdir(file_path, list_name)
        else:
            list_name.append(file_path)


def compute_stat(filename):
    global first_timestamp
    global overuse_count
    global file_seq
    global diff_overuse_time_list
    global now_overuse_time_list
    global diff
    global pre_overuse_time

    row_count = 0

    df_total = pd.read_csv(filename)
    for row in df_total.iterrows():
        n12 = int(row[1][2])    # 时间戳
        n15 = int(row[1][5])    # 拥塞信号

        if row_count == 0 and file_seq == 0:    # 第一个文件的第一个时间戳
            first_timestamp = n12
            pre_overuse_time = n12

        diff = n12 - first_timestamp

        if diff > 18000000:
            break


        if int(row[1][5]) == 1:  # 如果是拥塞
            overuse_count += 1

            now_overuse_time = n12
            diff_overuse_time_list.append(now_overuse_time - pre_overuse_time)
            now_overuse_time_list.append(now_overuse_time - first_timestamp)
            pre_overuse_time = n12

        row_count += 1





if __name__ == '__main__':
    list_name = []
    listdir("file", list_name)

    for filename in list_name:

        if diff > 18000000:
            break
        print(filename)
        compute_stat(filename)
        file_seq += 1

    diff_packet = pd.DataFrame({
        'diff_overuse_time': diff_overuse_time_list,
        'now_overuse_time': now_overuse_time_list
    })
    diff_packet.to_csv('out.csv')

