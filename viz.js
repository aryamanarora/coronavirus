var dates = []
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

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

labels = ["0", "1", "10", "100", "1,000", "10,000", "100,000", "1,000,000"]
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
    .scaleExtent([1, 10])
    .on("zoom", zoomed)

svg.call(zoom)
svg.on("click", unzoomed)

function zoomed() {
    g.attr("transform", d3.event.transform)
}

function unzoomed() {
    svg.transition().duration(1000).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    )
}

var clicked_obj = null

var search = null
var topo = null

function load(us, data) {
    // name list for autocomplete
    topo = topojson.feature(us, us.objects.counties).features
    var names = []
    topo.forEach(function (d) {
        if (data.get(+d.id)) names.push(data.get(+d.id).name.toLowerCase().split(',')[0])
        else names.push("")
    })

    function get_names(needle) {
        needle = needle.toLowerCase()
        results = []
        names.forEach(function (name, idx) {
            if (results.length == 5) return
            if (name.includes(needle)) {
                results.push(idx)
            }
        })
        return results
    }

    // counties and states drawn on svg
    counties = g.selectAll("path")
        .data(topo)
        .enter()
        .append("path")
            .attr("d", path)
            .attr("class", "county")
            .attr("id", function (d) {
                dates.forEach(function (date) {
                    if (!data.get(+d.id)) return
                    if (!(date in data.get(+d.id))) {
                        x = data.get(+d.id)
                        x[date] = {"cases": 0, "deaths": 0}
                        data.set(+d.id, x)
                    }
                })
                return "id-" + +d.id 
            })
            .on("click", clicked)

    states = g.append("path")
        .datum(topojson.feature(us, us.objects.states, function(a, b) { return a !== b }))
            .attr("class", "states")
            .attr("d", path)

    // New York City is a special case, the five boroughs are treated as one object
    new_york = [36081, 36005, 36047, 36085]
    new_york.forEach(d => {
        data.set(d, data.get(36061))
        d3.select("#id-" + d)
            .attr("id", "id-36061")
    })
    
    // search box
    names = new Map([...names.entries()].sort())
    search = d3.select(".search")
        .append("input")
            .attr("type", "text")
            .attr("class", "form-control")
            .attr("placeholder", "County (or County-Equivalent)")
            .on("keyup", function() {
                var d = this.value
                d3.select(".search").select(".dropdown-menu").remove()
                if (d == "") return
                var add = d3.select(".search")
                    .append("div")
                    .attr("class", "dropdown-menu")
                    .style("display", "inline")
                res = get_names(d)
                res.forEach(function (x) {
                    add.append("a")
                        .attr("class", "dropdown-item")
                        .attr("href", "#")
                        .text(data.get(+topo[x].id).name)
                        .on("click", function () {
                            clicked(topo[x])
                        })
                })
            })

    var slider = d3.select(".slider")
        .append("input")
            .attr("class", "form-control-range")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", dates.length - 1)
            .attr("step", 1)
            .on("input", function() {
                var date = this.value
                update(date)
            })

    function clicked(d) {
        if (data.get(+d.id).id == clicked_obj) { 
            unzoomed()
            clicked_obj = null
            counties.style("opacity", "1")
            infobar.transition()
                .duration(250)
                .style("opacity", 0)
            return
        }
        infobar.selectAll("*").remove();
        infobar.transition()
            .duration(250)
            .style("opacity", 1)

        clicked_obj = data.get(+d.id).id
        
        counties.style("opacity", 0.5)
        d3.selectAll("#id-" + data.get(+d.id).id)
            .style("opacity", "1")

        const [[x0, y0], [x1, y1]] = path.bounds(d)
        d3.event.stopPropagation()
        svg.transition().duration(1000).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(10, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.mouse(svg.node())
        )
        
        update(slider.property("value"))
    }
    
    function update(key){
        infobar.selectAll("*").remove();
        slider.property("value", key)
        d3.select(".date")
            .text(months[parseInt(dates[key].slice(0, 2)) - 1] + " " + parseInt(dates[key].slice(3)) + ", 2020")
        counties.style("fill", function(d) {
                if (data.get(+d.id) && dates[key] in data.get(+d.id)) {
                    return color(data.get(+d.id)[dates[key]].cases)
                }
                return color(0)
            })
            .on("mouseover", function(d) {
                var obj = d3.selectAll("#id-" + data.get(+d.id).id)
                if (clicked_obj) obj.style("opacity", 1)
                else obj.style("opacity", 0.2)

                tooltip.transition()
                    .duration(250)
                    .style("opacity", 1)
                tooltip.html(
                    "<p><strong>" + data.get(+d.id).name + "</strong><br>" +
                        data.get(+d.id)[dates[key]].cases.toLocaleString() + " confirmed case" +
                        (data.get(+d.id)[dates[key]].cases == 1 ? "" : "s") +
                        "</p>")
                    .style("left", (d3.event.pageX + 15) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            })
            .on("mousemove", function (d) {
                tooltip
                    .style("left", (d3.event.pageX + 15) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            })
            .on("mouseout", function (d) {
                var obj = d3.selectAll("#id-" + data.get(+d.id).id)
                if (clicked_obj != data.get(+d.id).id) {
                    if (clicked_obj) obj.transition()
                        .duration(150)
                        .style("opacity", 0.5)
                    else obj.transition()
                        .duration(150)
                        .style("opacity", 1)
                }

                tooltip.transition()
                    .duration(250)
                    .style("opacity", 0)
            })
        
        if (clicked_obj == null) return

        d = {"id": clicked_obj}

        var cases = data.get(+d.id)[dates[key]].cases
        var deaths = data.get(+d.id)[dates[key]].deaths

        infobar.append("h3").text(data.get(+d.id).name)
        infobar.append("p").text(cases.toLocaleString() + " confirmed case" + (cases == 1 ? "" : "s"))
        infobar.append("p").text(deaths.toLocaleString() + " death" + (deaths == 1 ? "" : "s"))
        infobar.append("p").text(data.get(+d.id).population.toLocaleString() + " people")

        var line = infobar.append("svg")
            .attr("height", graph_height + 50)
            .attr("width", graph_width + 50)
            .append("g")
            .attr("transform", "translate(40, 10)")

        dat = []
        dat_deaths = []
        start = dates.length
        for (var id = 0; id < dates.length; id++) {
            if (data.get(+d.id)[dates[id]].cases > 0) {
                if (start == dates.length) {
                    dat.push({"x": id - 1, "y": 0})
                    dat_deaths.push({"x": id - 1, "y": 0})
                    start = id
                }
            }
            if (start != dates.length) {
                dat.push({"x": id, "y": data.get(+d.id)[dates[id]].cases})
                dat_deaths.push({"x": id, "y": data.get(+d.id)[dates[id]].deaths})
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
            .attr("transform", "rotate(-45) translate(-3, 0)")
            
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
        
        if (key - start >= -1) {
            line.append("circle")
                .attr("cx", x(key))
                .attr("cy", y(dat[key - start + 1].y))
                .attr("r", 4)
                .style("fill", "steelblue")
            line.append("circle")
                .attr("cx", x(key))
                .attr("cy", y(dat_deaths[key - start + 1].y))
                .attr("r", 4)
                .style("fill", "red")
        }
    }
    
    update(dates.length - 1)
}

var data = new Map()

d3.json("data/counties-10m.json").then(function(us) {
    d3.csv("data/lookup.csv", function (d) {
        return [+d.FIPS, {"population": +d.Population, "name": d.Admin2 + ", " + d.Province_State}]
    }).then(function(pop) {
        pop = new Map(pop)
        d3.csv("https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv", function(d) {
            d.date = d.date.slice(5)
            if (d.county === "New York City") d.fips = 36061
            if (!dates.includes(d.date)) {
                dates.push(d.date)
            }
            if (data.get(+d.fips)) {
                x = data.get(+d.fips)
                x[d.date] = {"cases": +d.cases, "deaths": +d.deaths}
                data.set(+d.fips, x)
            }
            else {
                x = {}
                x[d.date] = {"cases": +d.cases, "deaths": +d.deaths}
                x["name"] = pop.get(+d.fips).name
                x["id"] = +d.fips
                x["population"] = pop.get(+d.fips).population
                data.set(+d.fips, x)
            }
        }).then(function (d) {
            pop.forEach(function (value, key) {
                if (!data.get(key)) {
                    data.set(key, {"name": value.name, "population": value.population, "id": key})
                }
            })
            load(us, data)
        })
    })
})
