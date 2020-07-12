import pandas
import sys
# print ("the script has the name %s" % (sys.argv[1]))
import pandas as pd 
import os
if(len(sys.argv) != 3):
    print('Please provide the correct arguments')
    print('Usages:')
    print('    1) pLoss.py -f /file/')
    print('    2) pLoss.py -d /directory/')


if(sys.argv[1] == '-d'):
    root_dir = sys.argv[2]
    print('distance;lost;total;percentage;')
    for file in os.listdir(root_dir):
        if(file != 'ploss.py'):
		    filename = os.path.join(root_dir, file)
		    # print('-----' + file + '-----')
		    f = list(pd.read_csv(filename, sep=';')['nSample'] / 0.02)
		    last = round(f[0])
		    total_lost = 0
		    for i in f[1:]:
		        t = round(i)
		        diff = t - last
		        if(diff > 1.0):
		            # print(diff)
		            total_lost += diff
		        last = t
		    print('{};{};{};{};'.format(file.replace('m','').split('_')[0], total_lost, round(f[-1]), round(100*total_lost/round(f[-1]), 2)))
		    # print("total packet: %d" % round(f[-1]))
		    # print("lost packets: %d" % total_lost)

		    # print("percentage of lost packets: " + str(round(100*total_lost/round(f[-1]), 2)) + "%")
		    # print('---------------')


elif (sys.argv[1] == '-f'):
    filename = sys.argv[2]
    print('-----' + filename + '-----')
    f = list(pd.read_csv(filename, sep=';')['nSample'] / 0.02)
    last = round(f[0])
    total_lost = 0
    for i in f[1:]:
        t = round(i)
        diff = t - last
        if(diff > 1.0):
            # print(diff)
            total_lost += diff
        last = t
    print("total packet: %d" % round(f[-1]))
    print("lost packets: %d" % total_lost)

    print("percentage of lost packets: " + str(round(100*total_lost/round(f[-1]), 2)) + "%")
    print('---------------')
