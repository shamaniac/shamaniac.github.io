function daysPassed(date) {
  return Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
}

function prnDate(date) {
  const options = { weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year:'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  };
  return date.toLocaleDateString('ru-RU', options);
}

class Main {
  constructor(data, tmpl_src) {
    this.raw_data = data;
    this.filtered_data = this.raw_data;

    this.filter_data = {};
    this.filter_data.min_price = 3000;
    this.filter_data.max_price = 7000;
    this.filter_data.loc = "";
    this.filter_data.rooms = new Set();
    this.filter_data.rooms.add("3");
    this.filter_data.rooms.add("4");
    this.filter_data.min_area = 50;
    this.filter_data.max_area = 200;
    this.filter_data.sort_by = "date";
    this.filter_data.include_house = true;
    this.filter_data.include_apt = true;
    this.filter_data.stared = "show_stared";
    this.filter_data.show_hidden = false;


    Handlebars.registerHelper("zlt_to_usd", function(zlt) { return zlt * 0.22 });
    Handlebars.registerHelper("img", function(item) { return item.images[item.img_idx]; });
    Handlebars.registerHelper("dateToStr", prnDate);

    this.el_tmpl = Handlebars.compile(tmpl_src)

    for (const item of this.raw_data) {
      item.img_idx = 0;
      item.date = new Date(Date.parse(item.date));
      let data = window.localStorage.getItem(item.id);
      if (data) {
        item.stored = JSON.parse(data);
        if (!("desc" in item.stored)) {
          item.stored.desc = "";
        }
      } else {
        item.stored = {delted:false, stared:false, desc: ""};
      }
    }

    this.filter();

    let self = this;

    // top ui.
    $( function() {
      $( "#slider-range" ).slider({
        range: true,
        min: 0,
        max: 20000,
        values: [ self.filter_data.min_price, self.filter_data.max_price ],
        step: 500,
        slide: function( event, ui ) {
          self.render_range();
          self.filter_data.min_price = $( "#slider-range" ).slider( "values", 0 );
          self.filter_data.max_price = $( "#slider-range" ).slider( "values", 1 );
          self.filter();
          self.render();
        }
      });

      $( "#slider-area" ).slider({
        range: true,
        min: 0,
        max: 200,
        values: [ self.filter_data.min_area, self.filter_data.max_area ],
        step: 5,
        slide: function( event, ui ) {
          self.filter_data.min_area = $( "#slider-area" ).slider( "values", 0 );
          self.filter_data.max_area = $( "#slider-area" ).slider( "values", 1 );
          self.filter_changed();
          self.render_area();
        }
      });

    });
  }

  stared_select() {
    this.filter_data.stared = $("#stared_select").val();
    this.filter_changed();
  }

  show_hidden_clicked() {
    this.filter_data.show_hidden = !this.filter_data.show_hidden;
    this.filter_changed();
  }

  description_changed(idx) {
    let item = this.filtered_data[idx];
    item.stored.desc = $("#edit_" + idx).val();
    this.save_item_data(item);
  }

  star_clicked(idx) {
    let item = this.filtered_data[idx];
    item.stored.stared = !item.stored.stared;
    this.save_item_data(item);
    this.filter_changed();
  }

  hide_clicked(idx) {
    let item = this.filtered_data[idx];
    item.stored.deleted = !item.stored.deleted;
    this.save_item_data(item);
    this.filter_changed();
  }

  save_item_data(item) {
    window.localStorage.setItem(item.id, JSON.stringify(item.stored));
  }

  sort_by_clicked() {
    this.filter_data.sort_by = $("#sort_by").val();
    this.filter_changed();
  }

  rooms_clicked(n) {
    if (this.filter_data.rooms.has(n)) {
      this.filter_data.rooms.delete(n);
    } else {
      this.filter_data.rooms.add(n);
    }
    this.filter_changed();
  }

  house_clicked() {
    this.filter_data.include_house = !this.filter_data.include_house;
    this.filter_changed();
  }

  apt_clicked() {
    this.filter_data.include_apt = !this.filter_data.include_apt;
    this.filter_changed();
  }

  filter_changed() {
    this.filter();
    this.render_main_list();
    this.render_header();
  }

  filter() {
    let self = this;
    this.filtered_data = this.raw_data.filter(function(x) {
      if (self.filter_data.loc.length != 0 && x.location.search(self.filter_data.loc) == -1 ){
        return false;
      }
      if (x.rooms == "2" || x.rooms == "1") {
        return false;
      }
      if (!self.filter_data.rooms.has("4") && !x.rooms == "3") {
        return false
      }
      if (!self.filter_data.rooms.has("3") && x.rooms == "3") {
        return false;
      }

      if (x.area < self.filter_data.min_area || x.area > self.filter_data.max_area) {
        if (x.area != 0) {
          return false;
        }
      }
      if (!self.filter_data.include_house && x.is_house) {
        return false;
      }
      if (!self.filter_data.include_apt && !x.is_house) {
        return false;
      }
      if (self.filter_data.stared == "hide_stared" && x.stored.stared) {
        return false;
      }
      if (self.filter_data.stared == "only_stared" && !x.stored.stared) {
        return false;
      }
      if (!self.filter_data.show_hidden && x.stored.deleted) {
        return false;
      }

      return x.price >= self.filter_data.min_price && x.price <= self.filter_data.max_price;
    });

    this.filtered_data.sort(function(a, b) {
      if (self.filter_data.sort_by == "date") {
        return b.date - a.date;
      } else if (self.filter_data.sort_by == "location") {
        return a.location.localeCompare(b.location);
      } else if (self.filter_data.sort_by == "price") {
        return a.price - b.price;
      } else if (self.filter_data.sort_by == "area") {
        return b.area - a.area;
      }
    });
  }

  next_img(idx) {
    let item = this.filtered_data[idx];
    item.img_idx = (item.img_idx + 1) % item.images.length;
    $(`#img_${idx}`).attr("src", item.images[item.img_idx]);
  }
  prev_img(idx) {
    let item = this.filtered_data[idx];
    item.img_idx = (item.img_idx - 1 + item.images.length) % item.images.length;
    $(`#img_${idx}`).attr("src", item.images[item.img_idx]);
  }

  render_header() {
    $("#n_filtered").text(this.filtered_data.length);
  }

  render_range() {
    $( "#amount" ).val(`${this.filter_data.min_price} zlt - ${this.filter_data.max_price} zlt`);
  }

  render_area() {
    $("#area").val(`${this.filter_data.min_area} m2 - ${this.filter_data.max_area} m2`);
  }

  location_changed() {
    let val = $("#loc_edit").val();
    this.filter_data.loc = val;
    this.filter();
    this.render_main_list();
  }

  render_main_list() {
    var html = "";

    for (let i = 0; i < this.filtered_data.length; ++i) {
      html += this.el_tmpl({item:this.filtered_data[i],
                             item_idx:i,
                             encoded_location:encodeURIComponent(this.filtered_data[i].location)});
    }

    $("#main").html(html);
  }

  render() {
    let self = this;
    $(function() {
      self.render_header();
      self.render_main_list();
      self.render_range();
      self.render_area();
    });
  }
}
