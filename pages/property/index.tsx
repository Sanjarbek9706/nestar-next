import React, { ChangeEvent, MouseEvent, useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Box, Button, Menu, MenuItem, Pagination, Stack, Typography } from '@mui/material';
import PropertyCard from '../../libs/components/property/PropertyCard';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import Filter from '../../libs/components/property/Filter';
import { useRouter } from 'next/router';
import { PropertiesInquiry } from '../../libs/types/property/property.input';
import { Property } from '../../libs/types/property/property';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { Direction } from '../../libs/enums/common.enum';
import { useMutation, useQuery } from '@apollo/client';
import { GET_PROPERTIES } from '../../apollo/user/query';
import { T } from '../../libs/types/common';
import { LIKE_TARGET_PROPERTY } from '../../apollo/user/mutation';
import { sweetMixinErrorAlert } from '../../libs/sweetAlert';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const PropertyList: NextPage = ({ initialInput, ...props }: any) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const [searchFilter, setSearchFilter] = useState<PropertiesInquiry>(initialInput);
	const [likeTargetProperty] = useMutation(LIKE_TARGET_PROPERTY);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [sortingOpen, setSortingOpen] = useState(false);
	const [filterSortName, setFilterSortName] = useState('New');

	/** APOLLO REQUESTS **/
	const {
		loading: getPropertiesLoading,
		data: getPropertiesData,
		error: getPropertiesError,
		refetch: getPropertiesRefetch,
	} = useQuery(GET_PROPERTIES, {
		fetchPolicy: 'network-only',
		variables: { input: searchFilter },
		notifyOnNetworkStatusChange: true,
	});
	// Xato yoki yuklanishda eski natijalarni yangi filtr natijasi deb ko'rsatmaymiz.
	const properties: Property[] =
		getPropertiesError || getPropertiesLoading ? [] : getPropertiesData?.getProperties?.list ?? [];
	const total = getPropertiesData?.getProperties?.metaCounter?.[0]?.total ?? 0;
	const currentPage = searchFilter.page ?? 1;

	useEffect(() => {
		if (!router.isReady) return;
		// URL o'zgarsa (Back/Forward ham), filtr va sahifa birga yangilanadi.
		try {
			const input = typeof router.query.input === 'string' ? JSON.parse(router.query.input) : initialInput;
			setSearchFilter(input);
			setFilterSortName(
				input.sort === 'propertyPrice' ? (input.direction === Direction.ASC ? 'Lowest Price' : 'Highest Price') : 'New',
			);
		} catch {
			setSearchFilter(initialInput);
		}
	}, [router.isReady, router.query.input, initialInput]);

	const likePropertyHandler = async (user: T, id: string) => {
		try {
			if (!user?._id) throw new Error('Please log in to like a property.');
			// Yurakcha bosilganda like saqlanadi, keyin soni va belgisi yangilanadi.
			await likeTargetProperty({ variables: { input: id } });
			await getPropertiesRefetch();
		} catch (error: any) {
			await sweetMixinErrorAlert(error.message);
		}
	};

	const handlePaginationChange = async (event: ChangeEvent<unknown>, value: number) => {
		await router.push(
			{ pathname: '/property', query: { input: JSON.stringify({ ...searchFilter, page: value }) } },
			undefined,
			{ scroll: false },
		);
	};

	const sortingClickHandler = (e: MouseEvent<HTMLElement>) => {
		setAnchorEl(e.currentTarget);
		setSortingOpen(true);
	};

	const sortingCloseHandler = () => {
		setSortingOpen(false);
		setAnchorEl(null);
	};

	const sortingHandler = async (e: React.MouseEvent<HTMLLIElement>) => {
		const choice = e.currentTarget.id;
		const sort = choice === 'new' ? 'createdAt' : 'propertyPrice';
		const direction = choice === 'lowest' ? Direction.ASC : Direction.DESC;
		setSortingOpen(false);
		setAnchorEl(null);
		await router.push(
			{ pathname: '/property', query: { input: JSON.stringify({ ...searchFilter, page: 1, sort, direction }) } },
			undefined,
			{ scroll: false },
		);
	};

	if (device === 'mobile') {
		return <h1>PROPERTIES MOBILE</h1>;
	} else {
		return (
			<div id="property-list-page" style={{ position: 'relative' }}>
				<div className="container">
					<Box component={'div'} className={'right'}>
						<span>Sort by</span>
						<div>
							<Button onClick={sortingClickHandler} endIcon={<KeyboardArrowDownRoundedIcon />}>
								{filterSortName}
							</Button>
							<Menu anchorEl={anchorEl} open={sortingOpen} onClose={sortingCloseHandler} sx={{ paddingTop: '5px' }}>
								<MenuItem
									onClick={sortingHandler}
									id={'new'}
									disableRipple
									sx={{ boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px' }}
								>
									New
								</MenuItem>
								<MenuItem
									onClick={sortingHandler}
									id={'lowest'}
									disableRipple
									sx={{ boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px' }}
								>
									Lowest Price
								</MenuItem>
								<MenuItem
									onClick={sortingHandler}
									id={'highest'}
									disableRipple
									sx={{ boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px' }}
								>
									Highest Price
								</MenuItem>
							</Menu>
						</div>
					</Box>
					<Stack className={'property-page'}>
						<Stack className={'filter-config'}>
							{/* @ts-ignore */}
							<Filter searchFilter={searchFilter} initialInput={initialInput} />
						</Stack>
						<Stack className="main-config" mb={'76px'}>
							<Stack className={'list-config'}>
								{getPropertiesError ? (
									<Typography role="alert" color="error">
										Properties could not be loaded. Please try again.
									</Typography>
								) : getPropertiesLoading ? (
									<Typography role="status">Loading properties...</Typography>
								) : properties.length === 0 ? (
									<div className={'no-data'}>
										<img src="/img/icons/icoAlert.svg" alt="" />
										<p>No Properties found!</p>
									</div>
								) : (
									properties.map((property: Property) => {
										return (
											<PropertyCard property={property} key={property?._id} likePropertyHandler={likePropertyHandler} />
										);
									})
								)}
							</Stack>
							<Stack className="pagination-config">
								{properties.length !== 0 && (
									<Stack className="pagination-box">
										<Pagination
											page={currentPage}
											count={Math.ceil(total / searchFilter.limit)}
											onChange={handlePaginationChange}
											shape="circular"
											color="primary"
										/>
									</Stack>
								)}

								{properties.length !== 0 && (
									<Stack className="total-result">
										<Typography>
											Total {total} propert{total > 1 ? 'ies' : 'y'} available
										</Typography>
									</Stack>
								)}
							</Stack>
						</Stack>
					</Stack>
				</div>
			</div>
		);
	}
};

PropertyList.defaultProps = {
	initialInput: {
		page: 1,
		limit: 9,
		sort: 'createdAt',
		direction: 'DESC',
		search: {
			squaresRange: {
				start: 0,
				end: 500,
			},
			pricesRange: {
				start: 0,
				end: 2000000,
			},
		},
	},
};

export default withLayoutBasic(PropertyList);
