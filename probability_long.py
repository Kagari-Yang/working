import queue
import json
import os

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import random
import cmath

const_min = int(300)

diff_list = []
timestamp_list = [0]*const_min

def compute_pdf_cdf(data_list, data_len):
    pdf = [0]*data_len
    cdf = [0]*data_len
    for i in range(0, data_len):
        pdf[i] = data_list[i]/np.sum(data_list)
        if i > 0:
            cdf[i] = cdf[i-1] + pdf[i]
        else:
            cdf[0] = pdf[0]
    return pdf, cdf

def stat_frequency():
    global timestamp_list
    global const_min

    print('timestamp_min_mean:', np.mean(timestamp_list))
    print('timestamp_min_std:', np.std(timestamp_list))
    print('timestamp_min_max:', np.max(timestamp_list))
    print('timestamp_min_min:', np.min(timestamp_list))
    print('timestamp_min_sum:', np.sum(timestamp_list))
    print('timestamp_min_list:', timestamp_list)

    plt.figure(figsize=(15, 6.18))
    font_format = {'family': 'Times New Roman', 'size': 20}
    plt.xlabel('Time(min)', font_format)
    plt.ylabel('Overuse(count)', font_format)
    #plt.title('avg overuse time',font_format)
    plt.xticks(fontproperties='Times New Roman', size=15)
    plt.yticks(fontproperties='Times New Roman', size=15)

    ax = plt.gca()
    ax.spines['bottom'].set_linewidth(1.5)
    ax.spines['left'].set_linewidth(1.5)
    ax.spines['right'].set_linewidth(1.5)
    ax.spines['top'].set_linewidth(1.5)

    x = np.arange(0, const_min, 1)

    plt.plot(timestamp_list, color = 'blue', label='active')
    plt.legend(loc="best")
    #plt.bar(x, timestamp_list, linewidth=1, color='#e29c45', ec='black', alpha=0.7)
    plt.show()

def stat_interval():
    global diff_list

    print('diff_list:', diff_list)

    const_100ms = int(10000)

    diff_min_list = [0]*const_min
    diff_100ms_list = [0]*(int(const_100ms/100))

    for i in range(0, len(diff_list)):
        flag = int(diff_list[i]/(1000*60))
        if flag < const_min:
            diff_min_list[flag] += 1

        f = int(diff_list[i]/100)   # 100ms为单位
        if f < (const_100ms/100):
            diff_100ms_list[f] += 1


    #print(diff_list)
    print('diff_min_list:', diff_min_list)
    print('diff_100ms_list:', diff_100ms_list)

    d = np.array(diff_list)
    d = d/(1000*60)
    print('diff_min_mean:', np.mean(d))
    print('diff_min_std:', np.std(d))
    print('diff_min_max:', np.max(d))
    print('diff_min_min:', np.min(d))

    print('25%分位数：', np.percentile(d, 25))
    print('50%分位数:', np.percentile(d, 50))
    print('75%分位数：', np.percentile(d, 75))
    print('90%分位数：', np.percentile(d, 90))
    print('95%分位数：', np.percentile(d, 95))
    print('99%分位数：', np.percentile(d, 99))

    plt.figure(figsize=(15, 6.18))
    font_format = {'family': 'Times New Roman', 'size': 20}
    plt.xlabel('Interval Time(min)', font_format)
    plt.ylabel('Overuse Interval(count)', font_format)
    plt.xticks(fontproperties='Times New Roman', size=15)
    plt.yticks(fontproperties='Times New Roman', size=15)

    ax = plt.gca()
    ax.spines['bottom'].set_linewidth(1.5)
    ax.spines['left'].set_linewidth(1.5)
    ax.spines['right'].set_linewidth(1.5)
    ax.spines['top'].set_linewidth(1.5)


    plt.figure(figsize=(10, 6.18))
    plt.xlabel('Interval Time(100ms)', font_format)
    plt.ylabel('Probability', font_format)
    #plt.ylabel('Cumulative Probability', font_format)

    pdf, cdf = compute_pdf_cdf(diff_100ms_list, len(diff_100ms_list))
    
    print(pdf)
    plt.plot(pdf, color='blue', label = 'active')
    plt.legend(loc="best")
    plt.show()


def stat_duration():
    global diff_list

    limit_ms = int(500)
    duration_list = []
    diff_list_len = len(diff_list)

    i = 0
    while i < diff_list_len:
        if diff_list[i] > limit_ms:
            duration_list.append(100)
            i += 1
        else:
            temp_sum = diff_list[i]
            for j in range(i + 1, diff_list_len):
                if diff_list[j] <= limit_ms:
                    temp_sum += diff_list[j]
                else:
                    i = j
                    break
            temp_sum += 100
            duration_list.append(temp_sum)

    duration_list.sort()
    print('duration_list:', duration_list)
    print('duration_list_len:', len(duration_list))
    print('duration_mean:', np.mean(duration_list))
    print('duration_std:', np.std(duration_list))
    print('duration_max:', np.max(duration_list))
    print('duration_min:', np.min(duration_list))
    print('25%分位数：', np.percentile(duration_list, 25))
    print('50%分位数：', np.percentile(duration_list, 50))
    print('75%分位数：', np.percentile(duration_list, 75))
    print('90%分位数：', np.percentile(duration_list, 90))
    print('95%分位数：', np.percentile(duration_list, 95))
    print('99%分位数：', np.percentile(duration_list, 99))

    duration_count_len = int(max(duration_list)/100) + 1
    duration_count_list = [0] * duration_count_len
    for k in range(0, len(duration_list)):
        f = int(duration_list[k]/100)
        duration_count_list[f] += 1
    print('duration_count_list:', duration_count_list)
    duration_count_list = np.array(duration_count_list)

    plt.figure(figsize=(10, 6.18))
    font_format = {'family': 'Times New Roman', 'size': 20}
    plt.xlabel('Duration Time(100ms)', font_format)
    #plt.ylabel('Probability', font_format)
    plt.ylabel('Cumulative Probability', font_format)
    plt.xticks(fontproperties='Times New Roman', size=15)
    plt.yticks(fontproperties='Times New Roman', size=15)

    ax = plt.gca()
    ax.spines['bottom'].set_linewidth(1.5)
    ax.spines['left'].set_linewidth(1.5)
    ax.spines['right'].set_linewidth(1.5)
    ax.spines['top'].set_linewidth(1.5)

    pdf, cdf = compute_pdf_cdf(duration_count_list, len(duration_count_list))
 
    print(pdf)
    plt.plot(cdf, color = 'blue', label = 'active')
    #plt.plot(cdf, color='red')
    plt.legend(loc = 'best')
    plt.show()





if __name__ == '__main__':
    fileName = "diff_help_bad.csv"
    df_total = pd.read_csv(fileName)

    for row in df_total.iterrows():
        diff = row[1][1]
        timestamp = row[1][2]

        timestamp_flag = int(timestamp/(1000*60))   # 转化为分钟
        if timestamp_flag < const_min:
            timestamp_list[timestamp_flag] += 1
            diff_list.append(diff)

    #webrtc_frequency()
    #stat_frequency()
    #stat_interval()
    stat_duration()




