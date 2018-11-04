import React, { Component } from 'react'
import { API_URL, API_KEY, IMAGE_BASE_URL, BACKDROP_SIZE, POSTER_SIZE } from '../../config'

// CSS
import './Home.css'
// COMPONENTS
import HeroImage from '../elements/HeroImage/HeroImage'
import SearchBar from '../elements/SearchBar/SearchBar'
import FourColGrid from '../elements/FourColGrid/FourColGrid'
import MovieThumb from '../elements/MovieThumb/MovieThumb'
import LoadMoreBtn from '../elements/LoadMoreBtn/LoadMoreBtn'
import Spinner from '../elements/Spinner/Spinner'

class Home extends Component {
  state = {
    movies: [],
    heroImage: null,
    heroTitle: null,
    heroText: null,
    loading: false,
    currentPage: 0,
    totalPages: 0,
    searchTerm: ''
  }

  componentDidMount() {
    if (localStorage.getItem('HomeState')) {
      const state = JSON.parse(localStorage.getItem('HomeState'))
      this.setState({ ...state })
    } else {
      this.setState({ loading: true })
      const endpoint = `${API_URL}movie/popular?api_key=${API_KEY}&language=eng-US&page=1`
      this.fetchItems(endpoint)
    }
  }

  fetchItems = endpoint => {
    fetch(endpoint)
      .then(result => result.json())
      .then(result => {
        this.setState(
          {
            movies: [...this.state.movies, ...result.results],
            heroImage: this.state.heroImage || result.results[0].backdrop_path,
            heroTitle: this.state.heroTitle || result.results[0].title,
            heroText: this.state.heroText || result.results[0].overview,
            loading: false,
            currentPage: result.page,
            totalPages: result.total_pages
          },
          () => {
            if (this.state.searchTerm === '') {
              localStorage.setItem('HomeState', JSON.stringify(this.state))
            }
          }
        )
        // console.log(result);
      })
      .catch(error => console.error('Error:', error))
  }

  searchItems = searchTerm => {
    // console.log(searchTerm);
    let endpoint = ''
    this.setState({
      movies: [],
      loading: true,
      searchTerm
    })
    if (searchTerm === '') {
      endpoint = `${API_URL}movie/popular?api_key=${API_KEY}&language=eng-US&page=1`
    } else {
      endpoint = `${API_URL}search/movie?api_key=${API_KEY}&language=eng-US&query=${searchTerm}`
    }
    this.fetchItems(endpoint)
  }

  loadMoreItems = () => {
    let endpoint = ''
    this.setState({ loading: true })

    if (this.state.searchTerm === '') {
      endpoint = `${API_URL}movie/popular?api_key=${API_KEY}&language=eng-US&page=${this.state.currentPage + 1}`
    } else {
      endpoint = `${API_URL}search/movie?api_key=${API_KEY}&language=eng-US&query=${this.state.searchTerm}&page=${this.state.currentPage + 1}`
    }
    this.fetchItems(endpoint)
  }

  render() {
    return (
      <div className="rmdb-home">
        <div className="heroArea">
          <HeroImage image={`${IMAGE_BASE_URL}${BACKDROP_SIZE}${this.state.heroImage}`} title={this.state.heroTitle} text={this.state.heroText} />
          <SearchBar callback={this.searchItems} />
        </div>
        <div className="rmdb-home-grid">
          <FourColGrid header={this.state.searchTerm ? 'Search Result' : 'Popular Movies'} loading={this.state.loading}>
            {this.state.movies.map((element, i) => {
              return (
                <MovieThumb
                  key={i}
                  clickable={true}
                  image={element.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${element.poster_path}` : './images/no_image.jpg'}
                  movieId={element.id}
                  movieName={element.title}
                />
              )
            })}
          </FourColGrid>
          {this.state.loading ? <Spinner /> : null}
          {this.state.currentPage < this.state.totalPages && !this.state.loading ? <LoadMoreBtn text="Load More" onClick={this.loadMoreItems} /> : null}
        </div>
      </div>
    )
  }
}

export default Home
