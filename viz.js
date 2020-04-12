var dates = ["1/22/20", "1/23/20", "1/24/20", "1/25/20", "1/26/20", "1/27/20", "1/28/20",
    "1/29/20", "1/30/20", "1/31/20", "2/1/20", "2/2/20", "2/3/20", "2/4/20", "2/5/20",
    "2/6/20", "2/7/20", "2/8/20", "2/9/20", "2/10/20", "2/11/20", "2/12/20", "2/13/20",
    "2/14/20", "2/15/20", "2/16/20", "2/17/20", "2/18/20", "2/19/20", "2/20/20", "2/21/20",
    "2/22/20", "2/23/20", "2/24/20", "2/25/20", "2/26/20", "2/27/20", "2/28/20", "2/29/20",
    "3/1/20", "3/2/20", "3/3/20", "3/4/20", "3/5/20", "3/6/20", "3/7/20", "3/8/20", "3/9/20",
    "3/10/20", "3/11/20", "3/12/20", "3/13/20", "3/14/20", "3/15/20", "3/16/20", "3/17/20",
    "3/18/20", "3/19/20", "3/20/20", "3/21/20", "3/22/20", "3/23/20", "3/24/20", "3/25/20",
    "3/26/20", "3/27/20", "3/28/20", "3/29/20", "3/30/20", "3/31/20", "4/1/20", "4/2/20",
    "4/3/20", "4/4/20", "4/5/20", "4/6/20", "4/7/20", "4/8/20", "4/9/20", "4/10/20", "4/11/20"]

var container = d3.select("#map")
    .attr("width", 1000)
    .attr("height", 500)

var width = 1000
var height = 500

var graph_width = 300
var graph_height = 300

var svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)

var projection = d3.geoAlbersUsa()

var infobar = d3.select(".tooltip")
    .style("opacity", 0)
    .style("width", 480)

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

var path = d3.geoPath()
    .projection(projection)
    
var color_helper = d3.scaleLog([1, 1000, 1000000], ["#fcde9c", "#e34f6f", "#7c1d6f"])
function color(num) {
    if (num == 0 || num == null) return "white"
    return color_helper(num)
}

var legend = d3.select("#legend")
    .attr("width", "1000")
    .attr("height", "100")
    .selectAll("g.legend")
    .data([0, 1, 10, 100, 1000, 10000, 100000, 1000000])
    .enter()
    .append("g")
    .attr("class", "legend")

var ls_w = 73, ls_h = 20

function linepos(x) {
    if (x == 0) return 927
    x = Math.log10(x)
    return 854 - x * ls_w
}
		 
legend.append("rect")
    .attr("x", function(d, i){ return 1000 - (i*ls_w) - ls_w})
    .attr("y", 30)
    .attr("width", ls_w)
    .attr("height", ls_h)
    .style("fill", function(d, i) { return color(d) })

labels = ["0", "1", "10", "100", "1000", "10000", "100000", "1000000"]
legend.append("text")
    .attr("x", function(d, i){ return 1000 - (i*ls_w) - ls_w})
    .attr("y", 70)
    .text(function(d, i){ return labels[i] })

var legend_title = "Number of Coronavirus Cases"

legend.append("text")
    .attr("x", 417)
    .attr("y", 20)
    .text(function(){return legend_title})

g = svg.append("g")

var zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 8])
    .on("zoom", zoomed)

svg.call(zoom)
svg.on("click", unzoomed)

function zoomed() {
    g.attr("transform", d3.event.transform)
}

function unzoomed() {
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    )
}

var clicked_obj = null

function load(us, data, deaths) {
    data = new Map(data)
    deaths = new Map(deaths)

    var slider = d3.select(".slider")
        .append("input")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", dates.length - 1)
            .attr("step", 1)
            .on("input", function() {
                var date = this.value
                update(date)
            })

    function clicked(d) {
        if (data.get(d.id).id == clicked_obj) { 
            unzoomed()
            clicked_obj = null
            counties.style("opacity", "1")
            infobar.selectAll("g").remove();
            infobar.transition()
                .duration(250)
                .style("opacity", 0)
            return
        }

        infobar.transition()
            .duration(250)
            .style("opacity", 1)

        clicked_obj = data.get(d.id).id
        
        counties.style("opacity", "0.5")
        d3.selectAll("#id-" + data.get(d.id).id)
            .style("opacity", "1")

        const [[x0, y0], [x1, y1]] = path.bounds(d)
        d3.event.stopPropagation()
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(6, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.mouse(svg.node())
        )
        
        update(slider.property("value"))
    }
    
    counties = g.selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .enter()
        .append("path")
            .attr("d", path)
            .attr("class", "county")
            .attr("id", function (d) { return "id-" + d.id })
            .on("click", clicked)

    states = g.append("path")
        .datum(topojson.feature(us, us.objects.states, function(a, b) { return a !== b }))
            .attr("class", "states")
            .attr("d", path)

    new_york = [36081, 36005, 36047, 36085]
    new_york.forEach(d => {
        data.set(d, data.get(36061))
        deaths.set(d, deaths.get(36061))
        d3.select("#id-" + d)
            .attr("id", "id-36061")
    })

    dukes_and_nantucket = [25019]
    dukes_and_nantucket.forEach(d => {
        data.set(d, data.get(25007))
        deaths.set(d, deaths.get(25007))
        d3.select("#id-" + d)
            .attr("id", "id-25007")
    })
    
    function update(key){
        console.log(key)
        slider.property("value", key)
        d3.select(".date").text(dates[key])
        counties.style("fill", function(d) {
                if (data.get(d.id)) {
                    return color(data.get(d.id)[dates[key]])
                }
                return color(0)
            })
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(250)
                    .style("opacity", 1)
                tooltip.html(
                    "<p><strong>" + data.get(d.id).name + "</strong><br>" +
                        data.get(d.id)[dates[key]].toLocaleString() + " case" +
                        (data.get(d.id)[dates[key]] == 1 ? "" : "s") +
                        "</p>")
                    .style("left", (d3.event.pageX + 15) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(250)
                    .style("opacity", 0)
            })
        
        if (clicked_obj == null) return

        d = {"id": clicked_obj}
        infobar.html(
            "<p><h3>" + data.get(d.id).name + "</h3><br>" +
                data.get(d.id)[dates[key]].toLocaleString() + " confirmed case" +
                (data.get(d.id)[dates[key]] == 1 ? "" : "s") + "<br>" +
                deaths.get(d.id)[dates[key]].toLocaleString() + " death" +
                (deaths.get(d.id)[dates[key]] == 1 ? "" : "s") + "<br>" +
                data.get(d.id).population.toLocaleString() + " people" +
                "</p><br>")

        var line = infobar.append("svg")
            .attr("height", graph_height + 50)
            .attr("width", graph_width + 50)
            .append("g")
            .attr("transform", "translate(40, 10)")

        dat = []
        dat_deaths = []
        start = dates.length
        for (var id = 0; id < dates.length; id++) {
            if (data.get(d.id)[dates[id]] > 0) {
                if (start == dates.length) {
                    dat.push({"x": id - 1, "y": 0})
                    dat_deaths.push({"x": id - 1, "y": 0})
                    start = id
                }
            }
            if (start != dates.length) {
                dat.push({"x": id, "y": data.get(d.id)[dates[id]]})
                dat_deaths.push({"x": id, "y": deaths.get(d.id)[dates[id]]})
            }
        }
        
        var x = d3.scaleLinear()
            .domain([start - 1, dates.length - 1])
            .range([0, graph_width])

        line.append("g")
            .attr("transform", "translate(0, " + graph_height + ")")
            .call(d3.axisBottom(x).tickFormat((d, i) => dates[d]))
            .selectAll(".tick text")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-45) translate(-6, -10)")
            
        var y = d3.scaleLinear()
            .domain([0, d3.max(dat, function(d) {
                return parseInt(d.y)
            })])
            .range([graph_height, 0])

        line.append("g")
            .call(d3.axisLeft(y))
            .attr("transform", "translate(0, 0)")

        line.append("path")
            .datum(dat)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function(a) { return x(a.x) })
                .y(function(a) { return y(a.y) })
            )

        line.append("path")
            .datum(dat_deaths)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function(a) { return x(a.x) })
                .y(function(a) { return y(a.y) })
            )
    }
    
    update(dates.length - 1)
}

d3.json("us.json").then(function(us) {
    d3.csv("lookup.csv", function (d) {
        return [+d.UID, +d.Population]
    }).then(function(pop) {
        pop = new Map(pop)
        d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv", function(d) {
            ret = {'name': d["Admin2"] + ", " + d["Province_State"]}
            dates.forEach(function (date) {
                ret[date] = +d[date]
            })
            ret["population"] = pop.get(+d.UID)
            ret["id"] = +d.FIPS
            if (d.UID == '84070002') {
                ret["id"] = 25007
                return [25007, ret]
            }
            return [+d.FIPS, ret]
        }).then(function(data) {
            d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv", function(d) {
                ret = {}
                dates.forEach(function (date) {
                    ret[date] = +d[date]
                })
                if (d.UID == '84070002') {
                    ret["id"] = 25007
                    return [25007, ret]
                }
                return [+d.FIPS, ret]
            }).then(function(deaths) {
                load(us, data, deaths)
            })
        })
    })
})