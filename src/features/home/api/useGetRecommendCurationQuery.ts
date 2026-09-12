import { useQuery } from "@tanstack/react-query";
import { getGetRecommendCurationApi } from "@/shared/api";

const { getRecommendCuration } = getGetRecommendCurationApi();

export function useGetRecommendCurationQuery() {
	return useQuery({
		queryKey: ["getRecommendCuration"],
		queryFn: getRecommendCuration,
		staleTime: Infinity,
	});
}
