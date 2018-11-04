import React, { Component } from "react";
import FontAwesome from "react-fontawesome";
import "./SearchBar.css";

class SearchBar extends Component {
  state = {
    value: ""
  };

  timeout = null;

  doSearch = event => {
    this.setState({ value: event.target.value }); // VALUE FROM THE INPUT FIELD
    clearTimeout(this.Timeout);

    this.timeout = setTimeout(() => {
      this.props.callback(this.state.value);
    }, 1000);
  };
  render() {
    return (
      <div className="rmdb-searchbar">
        <div className="rmdb-searchbar-content">
          <FontAwesome className="rmdb-fa-search" name="search" size="2x" />
          <input
            type="text"
            className="rmdb-searchbar-input"
            placeholder="Search"
            onChange={this.doSearch}
            value={this.state.value} // GRAB THE VALUE FROM THE STATE
          />
        </div>
      </div>
    );
  }
}

export default SearchBar;
