#ifndef USING_H
#define USING_H

#include "string.h"
#include "QQueue"
#include "QVector"
#include "iostream"
#include "QFile"
#include "QTextStream"
#include "math.h"

#define min(a,b) a<b?a:b
#define max(a,b) a>b?a:b

using namespace std;
//---------------------------------类定义---------------------------------------------
class PacketTiming
{
public:
    PacketTiming(double a1,double a2, double a3)
    {
        arrival_time_ms = a1;
        smoothed_delay_ms = a2;
        raw_delay_ms = a3;

    }
    PacketTiming()
    {
        arrival_time_ms = 0.0;
        smoothed_delay_ms = 0.0;
        raw_delay_ms = 0.0;
    }
    double arrival_time_ms;
    double smoothed_delay_ms;
    double raw_delay_ms;

};

//----------------------------------全局变量定义---------------------------------------
// GCC算法中的参数
double kDefaultTrendlineSmoothingCoeff = 0.4;
double kDefaultTrendlineThresholdGain = 4.0;
double k_trendline_window_size = 20;
double PACKET_COUNT = 1000;
//send_times = [];
//recv_times = [];
double accumulated_delay = 0;
double smoothed_delay = 0;
//double num_of_deltas_ = 0;
double first_arrival_time_ms_ = -1.0;
double prev_trend = 0;
double threshold_ = 12.5;
//threshold_list = []  // 记录阈值的变化
QVector<double>threshold_list;
double time_over_using_ = -1;
double num_of_deltas_ = 0;
double overuse_counter_ = 0;
double current_bitrate_ = 5000;
//send_bitrate = []  // 发送码率的变化
//network_state = []  // 网络的过载信号记为1，低载信号即为-1，正常信号即为0
//trend_list = []
//intercept_list=[]
QVector<double>send_bitrate;
QVector<int>network_state;
QVector<double>trend_list;
QVector<double>intercept_list;
QVector<double>slope_list;

QString rate_control_state_ = "kRcHold";
double time_last_bitrate_change_ = 0;
double last_update_ms_ = -1;
//自定义：整体判断过载次数
int overuse_count = 0;
QQueue<PacketTiming> que;
//que = queue.Queue(k_trendline_window_size);

//// 最小二乘法中的x和y
//x_list = []
//y_list = []
QVector<double>x_list;
QVector<double>y_list;

//--------------------------------------函数声明--------------------------------------------------
double GetNearMaxIncreaseRateBpsPerSecond(int rtt);
double UpdateThreshold(double modified_trend,double now_ms);
int Trendline_update(double recv_delta_time, double send_delta_time, double send_time_ms, double arrival_time_ms, int packet_size,double* rtrend,double* rintercept);
int LinearFitSlope(QQueue<PacketTiming>packets,double* rtrend,double* rintercept);
double ChangeState(QString input);
double ChangeBitrate(QString detect_msg,double at_time);
double Gcc();


//--------------------------------------函数定义-----------------------------------------------


double GetNearMaxIncreaseRateBpsPerSecond(int rtt)
{
    double frame_size;
    int packets_per_frame;
    double avg_packet_size;
    double response_time;
    double increase_rate_bps_per_second;

    frame_size = current_bitrate_/30;
    packets_per_frame = ceil(frame_size/1200);
    avg_packet_size = frame_size / packets_per_frame;
    response_time = rtt + 100;
    increase_rate_bps_per_second = avg_packet_size/response_time;

    return 4000>increase_rate_bps_per_second?4000:increase_rate_bps_per_second;

}
double UpdateThreshold(double modified_trend, double now_ms)
{
//    cout<<"modified_trend"<<modified_trend<<endl;
    double k = 0;
    if (last_update_ms_  == -1)
    {
        last_update_ms_ = now_ms;
    }
//    cout<<"a: "<<modified_trend<<"  b:  "<<threshold_<<endl;
    if(fabs(modified_trend) <= threshold_ + 15.0)
    {
        k = 0;
        if(fabs(modified_trend)<threshold_)
        {
            k = 0.039;
        }
        else
        {
            k = 0.0087;
        }

        threshold_ += k * (fabs(modified_trend) - threshold_) * double(min(100,now_ms - last_update_ms_));
        if(threshold_ < 6)
        {
            threshold_ = 6;
        }
        if(threshold_ > 600)
        {
            threshold_ = 600;
        }

    }
        threshold_list.push_back(threshold_);
        last_update_ms_ = now_ms;
        return 0;
}
int Trendline_update(double recv_delta_time, double send_delta_time, double send_time_ms, double arrival_time_ms, int packet_size,double* rtrend,double* rintercept)
{
    double delta_ms;
    num_of_deltas_ += 1;
    delta_ms = recv_delta_time - send_delta_time;
    if(first_arrival_time_ms_ == -1)
    {

        first_arrival_time_ms_ = arrival_time_ms;
    }
    accumulated_delay += delta_ms;
    smoothed_delay = kDefaultTrendlineSmoothingCoeff * smoothed_delay + (1.0 - kDefaultTrendlineSmoothingCoeff) * accumulated_delay;

    PacketTiming item(arrival_time_ms - first_arrival_time_ms_, smoothed_delay, accumulated_delay);//= new PacketTiming(arrival_time_ms - first_arrival_time_ms_, smoothed_delay, accumulated_delay);
//    cout<<"*********************"<<recv_delta_time<<endl;
    if (que.size() == 20)
    {
        que.pop_front();

    }// 这里意思是20组为满
    que.push_back(item);

    x_list.push_back(arrival_time_ms - first_arrival_time_ms_);
    y_list.push_back(smoothed_delay);
    int ret;
    if (que.size() == 20)
    {
        ret = LinearFitSlope(que,rtrend,rintercept);

        return ret;
    }
    else
    {
        *rtrend = -1;
        *rintercept = -1;
        return -1;
    }
//    cout<<"que_size:   "<<que.size()<<endl;



}
double stodouble(string str)
{
        char *ch = new char[0];
        double d;
        for (int i = 0; i != str.length(); i++)
            ch[i] = str[i];
        d = atof(ch);
        return d;
}
double ChangeState(QString input)
{
//    cout<<input.toStdString()<<endl;
    if(input == "kBwNormal")
    {
//        cout<<"innn"<<endl;
        if(rate_control_state_ == "kRcHold")
        {
            rate_control_state_ = "kRcIncrease";
        }
        else if(rate_control_state_ == "kRcDecrease")
        {
            rate_control_state_ = "kRcHold";
        }
    }
    else if(input == "kBwOverusing")
    {
        rate_control_state_ = "kRcDecrease";
    }
    else if(input == "kBwUnderusing")
    {
        rate_control_state_ = "kRcHold";
    }
//
    return 0;
}
double ChangeBitrate(QString detect_msg, double at_time)
{

    double alpha = 0.0;
    double multiplicative_increase = 0.0;
//    cout<<detect_msg.toStdString()<<endl;
    ChangeState(detect_msg);
    if(rate_control_state_ == "kRcDecrease")
    {
        current_bitrate_ = current_bitrate_ * 0.85;
        time_last_bitrate_change_ = at_time;
//        send_bitrate.append(current_bitrate_)
        send_bitrate.push_back(current_bitrate_);


    }
    else if(rate_control_state_ == "kRcIncrease")
    {
//        cout<<"abcfgd"<<endl;
        alpha = pow(1.08, min(1, (at_time - time_last_bitrate_change_) / 1000));
        multiplicative_increase = max(current_bitrate_ * (alpha - 1), 1000);
        current_bitrate_ += multiplicative_increase;
        if (current_bitrate_ > 3000000)
        {
            current_bitrate_ = 3000000;
        }
//        send_bitrate.append(current_bitrate_)
        send_bitrate.push_back(current_bitrate_);
        time_last_bitrate_change_ = at_time;
    }
    else
    {
//        send_bitrate.append(current_bitrate_);
        send_bitrate.push_back(current_bitrate_);
    }
    return 0;
}
int LinearFitSlope(QQueue<PacketTiming>packets,double* rtrend,double* rintercept)
{
//    cout<<"a"<<endl;
    double x = 0.0;
    double y = 0.0;
    double sum_x = 0.0;
    double sum_y = 0.0;
    double x_avg = 1.0;
    double y_avg = 1.0;
    double numerator = 0;
    double denominator = 0;
    double trend = 0.0;
    double intercept = 0.0;
    PacketTiming packet;
    for (int i = 0; i < 20; ++i)
    {
        packet = packets.dequeue();
//        cout<<packet.arrival_time_ms<<endl;
        sum_x += packet.arrival_time_ms;
        sum_y += packet.smoothed_delay_ms;
        packets.enqueue(packet);
    }
    x_avg = sum_x / packets.size();
    y_avg = sum_y / packets.size();
//     std::cout<<sum_x<<std::endl;
//     std::cout<<sum_y<<std::endl;
    for (int i = 0; i < 20; ++i)
    {
        packet = packets.dequeue();
        x = packet.arrival_time_ms;
        y = packet.smoothed_delay_ms;
        numerator += (x - x_avg) * (y - y_avg);
        denominator += (x - x_avg) * (x - x_avg);
        packets.enqueue(packet);
    }

//    cout<<"denominator: "<<denominator<<endl;
//    cout<<"numerator: "<<numerator<<endl;
//    cout<<"x_avg: "<<x_avg<<endl;
//    cout<<"y_avg: "<<y_avg<<endl;

    if(denominator == 0)
    {
        *rtrend = -1.0;
        *rintercept = -1.0;
        return -1;
    }
    else
    {
        trend = numerator / denominator;
        intercept = y_avg - trend * x_avg;
        *rtrend = trend;
        *rintercept = intercept;
        return 0;
    }

}
double Gcc()
{

    double trend = 0;
    double intercept = 0;
//    double *rtrend = nullptr;
//    double *rintercept = nullptr;
//    int num_of_deltas_ = 0;
    double modified_trend = 0;
    network_state.clear();
    threshold_list.clear();
    send_bitrate.clear();
    trend_list.clear();
    double l1 = 0.0;
    double l2 = 1620007863947.0;
    double l3 = 1620007864153.0;
    double l4 = 6.0;
    double l5 = 6.0;
    QString l1s;
    QString l2s;
    QString l3s;
    QString l4s;
    QString l5s;


//    cout<<network_state.size()<<endl;
//------------------------------------------------------------------------------
    QFile inFile("data.csv");
    QStringList lines;

    if (inFile.open(QIODevice::ReadOnly))
    {

        QTextStream stream_text(&inFile);
        while (!stream_text.atEnd())
        {
            lines.push_back(stream_text.readLine());
        }
        cout<<"Gcc Running..."<<endl;
        double slope0 = 0.0;
        double slope1 = 0.0;
        double slope = 0.0;
        slope_list.push_back(0.0);
        for (int j = 1; j < lines.size(); j++)//lines.size()
        {
            QString line = lines.at(j);
            QStringList split = line.split(",");


//                cout << split.at(col).toStdString() << " ";
                //-----------------------------------------
                l1s = split.at(1);
                l1 = l1s.toDouble();
                if(j==1)
                {
                    slope0 = 0.0;
                    slope1 = l1;
                    slope_list.push_back(0.0);

                }
//                else if(j == line.size()-1)
//                {


////                    slope0 = slope1;
////                    slope1 = l1;
//                    slope = (slope1 - slope0)/5.0;
//                    slope_list.push_back(slope);

//                }
                else
                {

                    slope0 = slope1;
                    slope1 = l1;
                    slope = (slope1 - slope0)/5.0;
                    slope_list.push_back(slope);

                }


                l2s = split.at(2);
                l2 = l2s.toDouble();

                l3s = split.at(3);
                l3 = l3s.toDouble();
//                temp3 = l3s.toStdString();
//                l3 = stodouble(temp3);

                l4s = split.at(4);
                l4 = l4s.toDouble();

                l5s = split.at(5);
                l5 = l5s.toDouble();
//                cout<<l1<<"  "<<l2<<"  "<<l3<<"  "<<l4<<"  "<<l5<<endl;


                int ret = -2;
                ret = Trendline_update(l4,l5,l2,l3,0,&trend,&intercept);
//                cout<<"trend: "<<trend<<endl;
                if(trend != -1)
                {
            //        cout<<"in"<<endl;
//                    cout<<"num_of_deltas: "<<num_of_deltas_<<endl;
                    num_of_deltas_ = min(num_of_deltas_, 1000);
                    modified_trend = double(min(num_of_deltas_, 60)) * trend * 4;
//                    cout<<"ccc:"<<modified_trend<<endl;

                    if(modified_trend > threshold_)
                    {
                        if(time_over_using_ == -1)
                        {
                            time_over_using_ = 2.5;
                        }
                        else
                        {
                            time_over_using_ += 5.0;
                        }
                        overuse_counter_ += 1;
                        if(time_over_using_ > 100 && (overuse_counter_ > 1))
                        {
                            if(trend >= prev_trend)
                            {
                                time_over_using_ = 0;
                                overuse_counter_ = 0;
                                ChangeBitrate("kBwOverusing",l3);
                                overuse_count += 1;
                                network_state.push_back(1);

                            }
                            else
                            {
                                network_state.push_back(0);
                                ChangeBitrate("kBwNormal",l3);
                            }
                        }
                        else
                        {
                            network_state.push_back(0);
                            ChangeBitrate("kBwNormal", l3);

                        }
                    }
                    else if (modified_trend < -threshold_)
                    {
                        time_over_using_ = -1;
                        overuse_counter_ = 0;
                        ChangeBitrate("kBwUnderusing", l3);
                        network_state.push_back(-1);

                    }
                    else
                    {
                        time_over_using_ = -1;
                        overuse_counter_ = 0;
                        ChangeBitrate("kBwNormal", l3);
                        network_state.push_back(0);

                    }
                    UpdateThreshold(modified_trend,l3);
                    prev_trend = trend;
                    trend_list.push_back(trend);
                    intercept_list.push_back(intercept);

                }

                //----------------------------------------------------------

        }
        inFile.close();
    }
    else
    {
        return -1;
    }
//---------------------------------------------------------------------------------

    cout<<"network_state: "<<network_state.size()<<endl;
    cout<<"intercept_list: "<<intercept_list.size()<<endl;
    cout<<"trend_list: "<<trend_list.size()<<endl;
//    cout<<"network_state: "<<network_state.size()<<endl;

//---------------------------------------写数据----------------------------------------------


    cout<<slope_list.size()<<endl;
    cout<<lines.size()<<endl;
//    double aaaaa;
//    aaaaa = slope_list.at(lines.size()-1);

    QFile outFile("outdata.csv");
    QStringList linesout;
    linesout <<" "<<","<< "RTT," << "RecvTimeStamp," << "trend,"<<"slope,"<<"network_state,"<<"threshold,"<<"bitrate\n";
    int cindex = 0;
    for (int j = lines.size() - trend_list.size(); j < lines.size(); j++)//lines.size()
    {
        QString line = lines.at(j);
        QStringList splitout = line.split(",");
        linesout <<QString::number(cindex,'d',8)<<","<< splitout.at(1) << ","<< splitout.at(3) << "," <<QString::number(trend_list.at(cindex),'f',8)<<","<<QString::number(slope_list.at(j),'f',8)<< "," << QString::number(network_state.at(cindex),'f',8)
                 << "," <<QString::number(threshold_list.at(cindex),'f',8)<<","<<QString::number(send_bitrate.at(cindex),'f',8)<<"\n";
        cindex += 1;
    }


    if (outFile.open(QIODevice::WriteOnly))
    {
     for (int i = 0; i < linesout.size(); i++)
     {
         outFile.write(linesout[i].toStdString().c_str());
     }
     outFile.close();
    }
    cout<<"write done!"<<endl;

    return 0;




}

#endif // USING_H
