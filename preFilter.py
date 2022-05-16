import queue
import json
import os

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


def listdir(path, list_name):
    for file in os.listdir(path):
        file_path = os.path.join(path, file)
        if os.path.isdir(file_path):
            listdir(file_path, list_name)
        else:
            list_name.append(file_path)


def get_data(filename1, filename2):

    data01 = pd.read_csv(filename1)
    data02 = pd.read_csv(filename2)
    timeStamp_list1 = []
    seq_list1 = []
    timeStamp_list2 = []
    seq_list2 = []

    for row in data01.iterrows():

        n12 = row[1][1]
        timeStamp = int(n12*1000)
        n16 = row[1][6]
        n16_list = n16.split(", ")
        Seq = n16_list[2][4:]

        timeStamp_list1.append(timeStamp)
        seq_list1.append(int(Seq))

    for row in data02.iterrows():
        n12 = row[1][1]
        timeStamp = int(n12 * 1000)
        n16 = row[1][6]
        n16_list = n16.split(", ")
        Seq = n16_list[2][4:]

        timeStamp_list2.append(timeStamp)
        seq_list2.append(int(Seq))

    len1 = len(seq_list1)
    len2 = len(seq_list2)
    min_len = min(len1, len2)

    # 默认文件1为arrival，文件2为send
    # time1 - time2 > 0

    seq1_count = 0
    seq2_count = 0
    arrival_timeStamp = 0
    send_timeStamp = 0
    rtt = 0
    arrival_timeStamp_list = []
    send_timeStamp_list = []
    rtt_list = []

    print(seq_list1[0])

    for i in range(0, min_len):
        s1 = seq_list1[seq1_count]
        s2 = seq_list2[seq2_count]

        if s1 == s2:
            arrival_timeStamp = timeStamp_list1[seq1_count]
            send_timeStamp = timeStamp_list2[seq2_count]
            rtt = arrival_timeStamp - send_timeStamp

            arrival_timeStamp_list.append(arrival_timeStamp)
            send_timeStamp_list.append(send_timeStamp)
            rtt_list.append(rtt)
            seq1_count += 1
            seq2_count += 1
        elif s1 < s2:
            seq1_count += 1
        else:
            seq2_count += 1

    ret_data = pd.DataFrame({
        'arrival_timeStamp':arrival_timeStamp_list,
        'send_timeStamp':send_timeStamp_list,
        'rtt':rtt_list
    })

    ret_data.to_csv('wire_data_new02.csv')



if __name__ == '__main__':
    list_name = []
    listdir("data",list_name)

    for i in range(0,2):
        print(list_name[0], list_name[1])
        get_data(list_name[0], list_name[1])

    # for filename in list_name:
    #     print(filename)
    #     get_data(filename)