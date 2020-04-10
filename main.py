import csv
import matplotlib
import matplotlib.pyplot as plt
from labellines import labelLine, labelLines

colors = ['red', 'blue', 'green', 'yellow']

population = {}
with open('lookup.csv') as fin:
    reader = csv.reader(fin, delimiter=',')
    for i, row in enumerate(reader):
        if i > 0:
            try:
                population[row[0]] = int(row[-1])
            except:
                pass

count = 0
with open('data.csv') as fin:
    reader = csv.reader(fin, delimiter=',')
    header = []
    for i, row in enumerate(reader):
        if i % 100 == 0:
            print(i)
        if i == 0:
            header = row
        elif row[5] != 'Unassigned':
            start = -1
            for j in range(11, len(row)):
                if int(row[j]) > 0:
                    start = j
                    break
            if start != -1:
                try:
                    for i in range(11, len(row)):
                        row[i] = (int(row[i]) / population[row[0]]) * 100
                    
                    if row[-1] > 0.00:
                        plt.plot(list(range(len(row[start:]))), row[start:], label=row[5])
                        count += 1
                except:
                    pass

plt.xlabel('Number of Days since First Case')
plt.ylabel('Proportion of Population Infected')
plt.gca().yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter())
plt.title('Coronavirus in all U.S. Counties')
plt.show()
